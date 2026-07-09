use crate::config;
use crate::db::{self, Db};
use crate::igdb;
use crate::launcher;
use crate::models::{GameDto, PlaySessionDto};
use crate::scanner;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn scan_games(db: State<'_, Db>, app: AppHandle) -> Result<Vec<GameDto>, String> {
    // Filesystem enumeration of Steam/Epic manifests can take seconds on first
    // launch — run it off the async runtime worker so other IPC stays responsive.
    let db = db.0.clone();
    let games = tauri::async_runtime::spawn_blocking(move || {
        let conn = db.lock().map_err(|e| e.to_string())?;
        scanner::scan_all(&conn)
    })
    .await
    .map_err(|e| format!("scan task join: {e}"))??;

    let _ = app.emit("scan:complete", serde_json::json!({ "count": games.len() }));
    Ok(games.iter().map(|g| g.to_dto()).collect())
}

#[tauri::command]
pub fn get_games(db: State<'_, Db>) -> Result<Vec<GameDto>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let games = db::get_all_games(&conn)?;
    Ok(games.iter().map(|g| g.to_dto()).collect())
}

#[tauri::command]
pub fn get_game(db: State<'_, Db>, id: i64) -> Result<GameDto, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let game = db::get_game_by_id(&conn, id)?;
    Ok(game.to_dto())
}

#[tauri::command]
pub fn toggle_favorite(db: State<'_, Db>, id: i64) -> Result<bool, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::toggle_favorite(&conn, id)
}

#[tauri::command]
pub fn add_manual_game(db: State<'_, Db>, exe_path: String) -> Result<GameDto, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let scanned = crate::scanner::manual::add_manual_game(&exe_path)?;
    let row = db::upsert_scanned_game(&conn, &scanned)?;
    Ok(row.to_dto())
}

#[tauri::command]
pub fn remove_manual_game(db: State<'_, Db>, id: i64) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::remove_manual_game(&conn, id)
}

#[tauri::command]
pub fn launch_game(
    db: State<'_, Db>,
    app: AppHandle,
    id: i64,
) -> Result<PlaySessionDto, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    if launcher::is_game_running() {
        return Err("A game is already running".to_string());
    }
    let result = launcher::launch_game(&conn, id, app)?;
    Ok(PlaySessionDto {
        session_id: result.session_id,
        game_id: id,
        started_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs() as i64,
    })
}

#[tauri::command]
pub fn get_running_game() -> Result<Option<i64>, String> {
    Ok(launcher::running_game_id())
}

#[tauri::command]
pub async fn fetch_metadata(db: State<'_, Db>, app: AppHandle, id: i64) -> Result<GameDto, String> {
    let db = db.0.clone();
    let row = igdb::fetch_and_store_metadata(&db, id).await?;
    let _ = app.emit("metadata:fetched", serde_json::json!({ "gameId": id }));
    Ok(row.to_dto())
}

#[tauri::command]
pub fn set_igdb_credentials(client_id: String, client_secret: String) -> Result<bool, String> {
    let creds = config::IgdbCredentials {
        client_id,
        client_secret,
    };
    config::save_igdb_credentials(&creds)?;
    Ok(true)
}

#[tauri::command]
pub fn has_igdb_credentials() -> Result<bool, String> {
    Ok(config::load_igdb_credentials()?.is_some())
}

#[tauri::command]
pub async fn fetch_all_metadata(db: State<'_, Db>, app: AppHandle) -> Result<(), String> {
    let db = db.0.clone();
    let games = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        db::get_all_games(&conn)?
    };

    for game in &games {
        if game.igdb_id.is_some() {
            continue;
        }
        let _ = app.emit(
            "scan:progress",
            serde_json::json!({ "title": game.title }),
        );
        let game_id = game.id;
        match igdb::fetch_and_store_metadata(&db, game_id).await {
            Ok(_) => {
                let _ = app
                    .emit("metadata:fetched", serde_json::json!({ "gameId": game_id }));
            }
            Err(e) => eprintln!("Metadata fetch failed for {}: {}", game.title, e),
        }
    }

    Ok(())
}

#[tauri::command]
pub fn read_cover_image(db: State<'_, Db>, game_id: i64) -> Result<Option<Vec<u8>>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let game = db::get_game_by_id(&conn, game_id)?;

    match game.cover_path {
        Some(path) => std::fs::read(&path)
            .map(Some)
            .map_err(|e| format!("read cover: {e}")),
        None => Ok(None),
    }
}