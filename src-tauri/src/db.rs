use crate::models::{GameRow, ScannedGame};
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};

pub struct Db(pub Arc<Mutex<Connection>>);

pub fn open(path: &str) -> Result<Db, String> {
    let conn = Connection::open(path).map_err(|e| format!("open({path}): {e}"))?;
    init_schema(&conn).map_err(|e| format!("open/init_schema: {e}"))?;
    Ok(Db(Arc::new(Mutex::new(conn))))
}

fn init_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            source TEXT NOT NULL,
            source_id TEXT,
            exe_path TEXT,
            install_dir TEXT,
            cover_path TEXT,
            is_favorite INTEGER DEFAULT 0,
            last_played INTEGER,
            total_played_seconds INTEGER DEFAULT 0,
            igdb_id INTEGER,
            description TEXT,
            genres TEXT,
            created_at INTEGER NOT NULL,
            UNIQUE(source, source_id)
        );

        CREATE TABLE IF NOT EXISTS play_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            started_at INTEGER NOT NULL,
            ended_at INTEGER,
            duration_seconds INTEGER,
            FOREIGN KEY(game_id) REFERENCES games(id)
        );

        CREATE TABLE IF NOT EXISTS metadata_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            igdb_response TEXT,
            fetched_at INTEGER NOT NULL,
            FOREIGN KEY(game_id) REFERENCES games(id)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_exe ON games(exe_path) WHERE source = 'manual';
    ",
    )?;
    Ok(())
}

pub fn upsert_scanned_game(conn: &Connection, game: &ScannedGame) -> Result<GameRow, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("upsert_scanned_game/system_time: {e}"))?
        .as_secs() as i64;

    if game.source == "manual" {
        conn.execute(
            "INSERT INTO games (title, source, source_id, exe_path, install_dir, created_at)
             VALUES (?1, 'manual', NULL, ?2, ?3, ?4)
             ON CONFLICT(exe_path) WHERE source = 'manual' DO UPDATE SET title = ?1",
            params![game.title, game.exe_path, game.install_dir, now],
        )
        .map_err(|e| format!("upsert_scanned_game/manual: {e}"))?;
        let id = conn.last_insert_rowid();
        get_game_by_id(conn, id)
    } else {
        conn.execute(
            "INSERT INTO games (title, source, source_id, exe_path, install_dir, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(source, source_id) DO UPDATE SET
                title = excluded.title,
                install_dir = excluded.install_dir,
                exe_path = excluded.exe_path",
            params![
                game.title,
                game.source,
                game.source_id,
                game.exe_path,
                game.install_dir,
                now
            ],
        )
        .map_err(|e| format!("upsert_scanned_game/scanned: {e}"))?;
        get_game_by_source(conn, &game.source, game.source_id.as_deref())
    }
}

pub fn get_game_by_source(
    conn: &Connection,
    source: &str,
    source_id: Option<&str>,
) -> Result<GameRow, String> {
    let row = if let Some(sid) = source_id {
        conn.query_row(
            "SELECT * FROM games WHERE source = ?1 AND source_id = ?2",
            params![source, sid],
            map_game_row,
        )
    } else {
        return Err("source_id required for get_game_by_source".to_string());
    };
    row.map_err(|e| format!("get_game_by_source({source}): {e}"))
}

pub fn get_all_games(conn: &Connection) -> Result<Vec<GameRow>, String> {
    let mut stmt = conn
        .prepare("SELECT * FROM games ORDER BY title ASC")
        .map_err(|e| format!("get_all_games/prepare: {e}"))?;
    let games = stmt
        .query_map([], map_game_row)
        .map_err(|e| format!("get_all_games/query_map: {e}"))?;
    let mut result = Vec::new();
    for game in games {
        result.push(game.map_err(|e| format!("get_all_games/row: {e}"))?);
    }
    Ok(result)
}

pub fn get_game_by_id(conn: &Connection, id: i64) -> Result<GameRow, String> {
    conn.query_row(
        "SELECT * FROM games WHERE id = ?1",
        params![id],
        map_game_row,
    )
    .map_err(|e| format!("get_game_by_id({id}): {e}"))
}

pub fn toggle_favorite(conn: &Connection, id: i64) -> Result<bool, String> {
    conn.execute(
        "UPDATE games SET is_favorite = NOT is_favorite WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("toggle_favorite({id})/update: {e}"))?;
    let row: bool = conn
        .query_row(
            "SELECT is_favorite FROM games WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("toggle_favorite({id})/select: {e}"))?;
    Ok(row)
}

pub fn remove_manual_game(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute(
        "DELETE FROM games WHERE id = ?1 AND source = 'manual'",
        params![id],
    )
    .map_err(|e| format!("remove_manual_game({id}): {e}"))?;
    Ok(())
}

pub fn update_metadata(
    conn: &Connection,
    id: i64,
    igdb_id: Option<i64>,
    description: Option<&str>,
    genres: Option<&str>,
    cover_path: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "UPDATE games SET igdb_id = ?1, description = ?2, genres = ?3, cover_path = ?4 WHERE id = ?5",
        params![igdb_id, description, genres, cover_path, id],
    ).map_err(|e| format!("update_metadata({id}): {e}"))?;
    Ok(())
}

pub fn create_play_session(conn: &Connection, game_id: i64) -> Result<i64, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("create_play_session({game_id})/system_time: {e}"))?
        .as_secs() as i64;
    conn.execute(
        "INSERT INTO play_sessions (game_id, started_at) VALUES (?1, ?2)",
        params![game_id, now],
    )
    .map_err(|e| format!("create_play_session({game_id}): {e}"))?;
    Ok(conn.last_insert_rowid())
}

pub fn end_play_session(conn: &Connection, session_id: i64, game_id: i64) -> Result<i64, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("end_play_session({session_id})/system_time: {e}"))?
        .as_secs() as i64;
    let started_at: i64 = conn
        .query_row(
            "SELECT started_at FROM play_sessions WHERE id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("end_play_session({session_id})/query: {e}"))?;
    let duration = now - started_at;

    conn.execute(
        "UPDATE play_sessions SET ended_at = ?1, duration_seconds = ?2 WHERE id = ?3",
        params![now, duration, session_id],
    )
    .map_err(|e| format!("end_play_session({session_id})/update_session: {e}"))?;

    conn.execute(
        "UPDATE games SET total_played_seconds = total_played_seconds + ?1, last_played = ?2 WHERE id = ?3",
        params![duration, now, game_id],
    ).map_err(|e| format!("end_play_session({session_id})/update_game: {e}"))?;

    Ok(duration)
}

fn map_game_row(row: &rusqlite::Row) -> rusqlite::Result<GameRow> {
    Ok(GameRow {
        id: row.get(0)?,
        title: row.get(1)?,
        source: row.get(2)?,
        source_id: row.get(3)?,
        exe_path: row.get(4)?,
        install_dir: row.get(5)?,
        cover_path: row.get(6)?,
        is_favorite: row.get::<_, i64>(7)? != 0,
        last_played: row.get(8)?,
        total_played_seconds: row.get(9)?,
        igdb_id: row.get(10)?,
        description: row.get(11)?,
        genres: row.get(12)?,
        created_at: row.get(13)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn in_memory_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();
        conn
    }

    #[test]
    fn test_upsert_new_scanned_game() {
        let conn = in_memory_db();
        let game = ScannedGame {
            title: "Dota 2".to_string(),
            source: "steam".to_string(),
            source_id: Some("570".to_string()),
            exe_path: None,
            install_dir: Some("C:/Steam/dota2".to_string()),
        };
        let row = upsert_scanned_game(&conn, &game).unwrap();
        assert_eq!(row.title, "Dota 2");
        assert_eq!(row.source, "steam");
        assert_eq!(row.source_id, Some("570".to_string()));
        assert_eq!(row.is_favorite, false);
        assert_eq!(row.total_played_seconds, 0);
    }

    #[test]
    fn test_upsert_existing_preserves_playtime() {
        let conn = in_memory_db();
        let game = ScannedGame {
            title: "Dota 2".to_string(),
            source: "steam".to_string(),
            source_id: Some("570".to_string()),
            exe_path: None,
            install_dir: Some("C:/Steam/dota2".to_string()),
        };
        upsert_scanned_game(&conn, &game).unwrap();

        conn.execute(
            "UPDATE games SET total_played_seconds = 3600, is_favorite = 1 WHERE source = 'steam' AND source_id = '570'",
            [],
        ).unwrap();

        let updated = ScannedGame {
            title: "Dota 2 Updated".to_string(),
            source: "steam".to_string(),
            source_id: Some("570".to_string()),
            exe_path: None,
            install_dir: Some("C:/Steam/dota2_new".to_string()),
        };
        let row = upsert_scanned_game(&conn, &updated).unwrap();
        assert_eq!(row.title, "Dota 2 Updated");
        assert_eq!(row.install_dir, Some("C:/Steam/dota2_new".to_string()));
        assert_eq!(row.total_played_seconds, 3600);
        assert_eq!(row.is_favorite, true);
    }

    #[test]
    fn test_toggle_favorite() {
        let conn = in_memory_db();
        let game = ScannedGame {
            title: "Test".to_string(),
            source: "steam".to_string(),
            source_id: Some("1".to_string()),
            exe_path: None,
            install_dir: None,
        };
        let row = upsert_scanned_game(&conn, &game).unwrap();
        assert_eq!(row.is_favorite, false);

        let new_state = toggle_favorite(&conn, row.id).unwrap();
        assert_eq!(new_state, true);

        let new_state = toggle_favorite(&conn, row.id).unwrap();
        assert_eq!(new_state, false);
    }

    #[test]
    fn test_play_session_tracking() {
        let conn = in_memory_db();
        let game = ScannedGame {
            title: "Test".to_string(),
            source: "steam".to_string(),
            source_id: Some("1".to_string()),
            exe_path: None,
            install_dir: None,
        };
        let row = upsert_scanned_game(&conn, &game).unwrap();

        let session_id = create_play_session(&conn, row.id).unwrap();
        assert!(session_id > 0);

        std::thread::sleep(std::time::Duration::from_secs(1));
        let duration = end_play_session(&conn, session_id, row.id).unwrap();
        assert!(duration >= 1);

        let updated = get_game_by_id(&conn, row.id).unwrap();
        assert!(updated.total_played_seconds >= 1);
        assert!(updated.last_played.is_some());
    }

    #[test]
    fn test_remove_manual_game_only() {
        let conn = in_memory_db();
        let manual = ScannedGame {
            title: "Indie Game".to_string(),
            source: "manual".to_string(),
            source_id: None,
            exe_path: Some("C:/Games/indie.exe".to_string()),
            install_dir: None,
        };
        let row = upsert_scanned_game(&conn, &manual).unwrap();

        remove_manual_game(&conn, row.id).unwrap();
        let result = get_game_by_id(&conn, row.id);
        assert!(result.is_err());

        let steam = ScannedGame {
            title: "Steam Game".to_string(),
            source: "steam".to_string(),
            source_id: Some("999".to_string()),
            exe_path: None,
            install_dir: None,
        };
        let steam_row = upsert_scanned_game(&conn, &steam).unwrap();
        remove_manual_game(&conn, steam_row.id).unwrap();
        let still_there = get_game_by_id(&conn, steam_row.id);
        assert!(still_there.is_ok());
    }
}
