use crate::config;
use crate::db;
use crate::models::GameRow;
use rusqlite::Connection;
use serde::Deserialize;
use std::fs;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Debug, Deserialize)]
struct IgdbTokenResponse {
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct IgdbGame {
    id: i64,
    name: String,
    summary: Option<String>,
    cover: Option<IgdbCover>,
    genres: Option<Vec<IgdbGenre>>,
}

#[derive(Debug, Deserialize)]
struct IgdbCover {
    image_id: String,
}

#[derive(Debug, Deserialize)]
struct IgdbGenre {
    name: String,
}

/// Twitch OAuth tokens last ~60 days; re-use the cached token up to this long so
/// we don't authenticate on every metadata fetch (avoids rate limits, latency).
const TOKEN_REUSE: Duration = Duration::from_secs(50 * 60 * 60);

static TOKEN_CACHE: std::sync::OnceLock<Mutex<Option<(String, Instant)>>> =
    std::sync::OnceLock::new();

fn token_cache() -> &'static Mutex<Option<(String, Instant)>> {
    TOKEN_CACHE.get_or_init(|| Mutex::new(None))
}

/// Fetch IGDB metadata for `game_id` and store it. The DB lock is held only for
/// the two brief SQLite reads/writes around network IO, so concurrent commands
/// (e.g. toggle favorite) are not blocked for the duration of an IGDB request.
pub async fn fetch_and_store_metadata(
    db: &Arc<Mutex<Connection>>,
    game_id: i64,
) -> Result<GameRow, String> {
    let creds = config::load_igdb_credentials()?
        .ok_or("IGDB credentials not set. Please set them in Settings.")?;

    let game = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        db::get_game_by_id(&conn, game_id)?
    };

    let token = get_access_token(&creds.client_id, &creds.client_secret).await?;
    let igdb_game = search_game(&token, &creds.client_id, &game.title).await?;

    let igdb_id = igdb_game.id;
    let description = igdb_game.summary.clone();
    let genres = igdb_game.genres.as_ref().map(|g| {
        g.iter()
            .map(|genre| genre.name.clone())
            .collect::<Vec<_>>()
            .join(", ")
    });

    let cover_path = if let Some(cover) = &igdb_game.cover {
        match download_cover(&cover.image_id, game_id).await {
            Ok(path) => Some(path),
            Err(e) => {
                eprintln!("Cover download failed: {}", e);
                None
            }
        }
    } else {
        None
    };

    let row = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        db::update_metadata(
            &conn,
            game_id,
            Some(igdb_id),
            description.as_deref(),
            genres.as_deref(),
            cover_path.as_deref(),
        )?;
        db::get_game_by_id(&conn, game_id)?
    };

    Ok(row)
}

async fn get_access_token(client_id: &str, client_secret: &str) -> Result<String, String> {
    {
        let cache = token_cache().lock().unwrap();
        if let Some((tok, expires_at)) = cache.as_ref() {
            if Instant::now() < *expires_at {
                return Ok(tok.clone());
            }
        }
    }

    let client = reqwest::Client::new();
    let resp = client
        .post("https://id.twitch.tv/oauth2/token")
        .query(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("grant_type", "client_credentials"),
        ])
        .send()
        .await
        .map_err(|e| format!("IGDB auth request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("IGDB auth failed with status: {}", resp.status()));
    }

    let token: IgdbTokenResponse = resp
        .json()
        .await
        .map_err(|e| format!("IGDB auth parse error: {}", e))?;

    let expiry = Instant::now() + TOKEN_REUSE;
    let mut cache = token_cache().lock().unwrap();
    *cache = Some((token.access_token.clone(), expiry));
    Ok(token.access_token)
}

async fn search_game(token: &str, client_id: &str, title: &str) -> Result<IgdbGame, String> {
    let client = reqwest::Client::new();
    // Escape backslashes, double-quotes, and newlines so titles can't inject
    // additional query clauses into the IGDB POST body.
    let escaped = title
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t");
    let body = format!(
        "search \"{}\"; fields name,summary,cover.image_id,genres.name; limit 1;",
        escaped
    );

    let resp = client
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", client_id)
        .header("Authorization", format!("Bearer {}", token))
        .header("Accept", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| format!("IGDB search request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("IGDB search failed with status: {}", resp.status()));
    }

    let games: Vec<IgdbGame> = resp
        .json()
        .await
        .map_err(|e| format!("IGDB search parse error: {}", e))?;
    games
        .into_iter()
        .next()
        .ok_or(format!("No IGDB match found for: {}", title))
}

async fn download_cover(image_id: &str, game_id: i64) -> Result<String, String> {
    let url = format!(
        "https://images.igdb.com/igdb/image/upload/t_cover_big/{}.jpg",
        image_id
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Cover download request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Cover download failed with status: {}",
            resp.status()
        ));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Cover download read error: {}", e))?;
    let cover_path = config::cover_path_for_game(game_id)?;
    fs::write(&cover_path, &bytes).map_err(|e| format!("Cover write error: {}", e))?;
    Ok(cover_path)
}