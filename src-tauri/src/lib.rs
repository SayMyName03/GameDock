mod commands;
mod config;
mod db;
mod igdb;
mod launcher;
mod models;
mod scanner;

pub fn run() {
    let db_path = config::db_path().expect("Failed to get DB path");
    let db = db::open(&db_path).expect("Failed to open database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            commands::scan_games,
            commands::get_games,
            commands::get_game,
            commands::toggle_favorite,
            commands::add_manual_game,
            commands::remove_manual_game,
            commands::launch_game,
            commands::get_running_game,
            commands::fetch_metadata,
            commands::fetch_all_metadata,
            commands::set_igdb_credentials,
            commands::has_igdb_credentials,
            commands::read_cover_image,
            commands::get_platforms,
            commands::get_enabled_platforms,
            commands::set_enabled_platforms,
            commands::is_setup_done,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}