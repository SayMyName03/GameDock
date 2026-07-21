use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IgdbCredentials {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub setup_done: bool,
    #[serde(default)]
    pub igdb: Option<IgdbCredentials>,
    #[serde(default = "default_enabled_platforms")]
    pub enabled_platforms: Vec<String>,
}

fn default_enabled_platforms() -> Vec<String> {
    vec![
        "steam".to_string(),
        "epic".to_string(),
        "manual".to_string(),
    ]
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            setup_done: false,
            igdb: None,
            enabled_platforms: default_enabled_platforms(),
        }
    }
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

pub fn load_config() -> Result<AppConfig, String> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
        return Ok(config);
    }

    if let Ok(creds) = serde_json::from_str::<IgdbCredentials>(&content) {
        let config = AppConfig {
            setup_done: true,
            igdb: Some(creds),
            ..Default::default()
        };
        save_config(&config)?;
        return Ok(config);
    }

    Ok(AppConfig::default())
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = config_path()?;
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_igdb_credentials() -> Result<Option<IgdbCredentials>, String> {
    Ok(load_config()?.igdb)
}

pub fn save_igdb_credentials(creds: &IgdbCredentials) -> Result<(), String> {
    let mut config = load_config()?;
    config.igdb = Some(creds.clone());
    save_config(&config)
}

pub fn get_enabled_platforms() -> Result<Vec<String>, String> {
    Ok(load_config()?.enabled_platforms)
}

pub fn set_enabled_platforms(platforms: Vec<String>) -> Result<(), String> {
    let mut config = load_config()?;
    config.enabled_platforms = platforms;
    save_config(&config)
}

pub fn is_setup_done() -> Result<bool, String> {
    Ok(load_config()?.setup_done)
}

pub fn mark_setup_done() -> Result<(), String> {
    let mut config = load_config()?;
    config.setup_done = true;
    save_config(&config)
}
