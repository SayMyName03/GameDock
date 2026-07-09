use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IgdbCredentials {
    pub client_id: String,
    pub client_secret: String,
}

pub fn app_data_dir() -> Result<PathBuf, String> {
    let dir = dirs::data_dir()
        .ok_or("Could not find data directory")?
        .join("game-launcher");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn db_path() -> Result<String, String> {
    let dir = app_data_dir()?;
    Ok(dir.join("library.db").to_string_lossy().to_string())
}

pub fn covers_dir() -> Result<PathBuf, String> {
    let dir = app_data_dir()?.join("covers");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn cover_path_for_game(game_id: i64) -> Result<String, String> {
    let dir = covers_dir()?;
    Ok(dir
        .join(format!("{}.jpg", game_id))
        .to_string_lossy()
        .to_string())
}

pub fn config_path() -> Result<PathBuf, String> {
    let dir = app_data_dir()?;
    Ok(dir.join("config.json"))
}

pub fn load_igdb_credentials() -> Result<Option<IgdbCredentials>, String> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let creds: IgdbCredentials = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(Some(creds))
}

pub fn save_igdb_credentials(creds: &IgdbCredentials) -> Result<(), String> {
    let path = config_path()?;
    let content = serde_json::to_string_pretty(creds).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}
