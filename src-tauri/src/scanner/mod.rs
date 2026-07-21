pub mod epic;
pub mod manual;
pub mod steam;

use crate::models::{GameRow, ScannedGame};
use rusqlite::Connection;

pub fn scan_all(conn: &Connection, enabled_platforms: &[String]) -> Result<Vec<GameRow>, String> {
    let mut all_scanned: Vec<ScannedGame> = Vec::new();

    if enabled_platforms.contains(&"steam".to_string()) {
        match steam::scan_steam() {
            Ok(games) => all_scanned.extend(games),
            Err(e) => eprintln!("Steam scan error: {}", e),
        }
    }

    if enabled_platforms.contains(&"epic".to_string()) {
        match epic::scan_epic() {
            Ok(games) => all_scanned.extend(games),
            Err(e) => eprintln!("Epic scan error: {}", e),
        }
    }

    for game in &all_scanned {
        if let Err(e) = crate::db::upsert_scanned_game(conn, game) {
            eprintln!("Upsert error for {}: {}", game.title, e);
        }
    }

    crate::db::get_all_games(conn)
}
