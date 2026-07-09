use crate::models::ScannedGame;
use std::fs;
use std::path::PathBuf;

pub fn scan_steam() -> Result<Vec<ScannedGame>, String> {
    let steam_path = find_steam_install()?;
    let library_folders = parse_library_folders(&steam_path)?;
    let mut games = Vec::new();

    for folder in library_folders {
        let steamapps_dir = PathBuf::from(&folder).join("steamapps");
        if !steamapps_dir.exists() {
            continue;
        }

        for entry in fs::read_dir(&steamapps_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let filename = entry.file_name().to_string_lossy().to_string();

            if filename.starts_with("appmanifest_") && filename.ends_with(".acf") {
                let content = fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
                if let Some(game) = parse_app_manifest(&content, &folder) {
                    games.push(game);
                }
            }
        }
    }

    Ok(games)
}

fn find_steam_install() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(steam) = hkcu.open_subkey("Software\\Valve\\Steam") {
            if let Ok(path) = steam.get_value::<String, _>("SteamPath") {
                return Ok(path.replace("/", "\\"));
            }
        }
    }

    let fallbacks = ["C:\\Program Files (x86)\\Steam", "C:\\Program Files\\Steam"];
    for path in &fallbacks {
        if PathBuf::from(path).exists() {
            return Ok(path.to_string());
        }
    }

    Err("Steam installation not found".to_string())
}

fn parse_library_folders(steam_path: &str) -> Result<Vec<String>, String> {
    let vdf_path = PathBuf::from(steam_path)
        .join("steamapps")
        .join("libraryfolders.vdf");
    let content = fs::read_to_string(&vdf_path)
        .map_err(|e| format!("Could not read libraryfolders.vdf: {}", e))?;

    let mut folders = vec![steam_path.to_string()];
    let parsed = parse_vdf(&content);

    if let Some(libraryfolders) = parsed.get("libraryfolders") {
        if let Some(obj) = libraryfolders.as_object() {
            for (_key, value) in obj {
                if let Some(path) = value.get("path").and_then(|p| p.as_str()) {
                    let cleaned = path.replace("\\\\", "\\").replace("/", "\\");
                    if !folders.contains(&cleaned) {
                        folders.push(cleaned);
                    }
                }
            }
        }
    }

    Ok(folders)
}

fn parse_app_manifest(content: &str, library_folder: &str) -> Option<ScannedGame> {
    let parsed = parse_vdf(content);
    let app_state = parsed.get("AppState")?;

    let appid = app_state.get("appid")?.as_str()?.to_string();
    let name = app_state.get("name")?.as_str()?.to_string();
    let installdir = app_state.get("installdir")?.as_str()?.to_string();

    let install_path = PathBuf::from(library_folder)
        .join("steamapps")
        .join("common")
        .join(&installdir)
        .to_string_lossy()
        .to_string();

    Some(ScannedGame {
        title: name,
        source: "steam".to_string(),
        source_id: Some(appid),
        exe_path: None,
        install_dir: Some(install_path),
    })
}

/// Parse Valve's VDF/ACF key-value format into serde_json::Value
pub fn parse_vdf(content: &str) -> serde_json::Value {
    let mut stack: Vec<(String, serde_json::Map<String, serde_json::Value>)> = Vec::new();
    let mut current_key = String::new();
    let mut current_map = serde_json::Map::new();
    let tokens = tokenize_vdf(content);

    for token in tokens {
        match token.as_str() {
            "{" => {
                stack.push((current_key.clone(), std::mem::take(&mut current_map)));
                current_key.clear();
            }
            "}" => {
                let value = serde_json::Value::Object(std::mem::take(&mut current_map));
                let (parent_key, mut parent_map) = stack.pop().unwrap_or_default();
                parent_map.insert(parent_key, value);
                current_map = parent_map;
                current_key.clear();
            }
            _ => {
                if current_key.is_empty() {
                    current_key = token;
                } else {
                    current_map.insert(
                        std::mem::take(&mut current_key),
                        serde_json::Value::String(token),
                    );
                }
            }
        }
    }

    serde_json::Value::Object(current_map)
}

fn tokenize_vdf(content: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in content.chars() {
        if in_quotes {
            if ch == '"' {
                tokens.push(current.to_string());
                current.clear();
                in_quotes = false;
            } else {
                current.push(ch);
            }
        } else {
            match ch {
                '"' => in_quotes = true,
                '{' | '}' => {
                    if !current.trim().is_empty() {
                        tokens.push(current.trim().to_string());
                        current.clear();
                    }
                    tokens.push(ch.to_string());
                }
                _ => {}
            }
        }
    }

    tokens
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_library_folders_vdf() {
        let content = std::fs::read_to_string("tests/fixtures/libraryfolders.vdf").unwrap();
        let parsed = parse_vdf(&content);
        let libraryfolders = parsed.get("libraryfolders").unwrap();
        let folder0 = libraryfolders.get("0").unwrap();
        assert_eq!(
            folder0.get("path").unwrap().as_str().unwrap(),
            "C:\\Program Files (x86)\\Steam"
        );
        let folder1 = libraryfolders.get("1").unwrap();
        assert_eq!(
            folder1.get("path").unwrap().as_str().unwrap(),
            "D:\\SteamLibrary"
        );
    }

    #[test]
    fn test_parse_app_manifest_acf() {
        let content = std::fs::read_to_string("tests/fixtures/appmanifest_570.acf").unwrap();
        let game = parse_app_manifest(&content, "C:\\Program Files (x86)\\Steam");
        assert!(game.is_some());
        let game = game.unwrap();
        assert_eq!(game.title, "Dota 2");
        assert_eq!(game.source, "steam");
        assert_eq!(game.source_id, Some("570".to_string()));
        assert!(game.install_dir.as_ref().unwrap().contains("dota 2 beta"));
    }

    #[test]
    fn test_parse_vdf_simple() {
        let vdf = r#"
        "root"
        {
            "key"		"value"
            "number"		"42"
        }
        "#;
        let parsed = parse_vdf(vdf);
        let root = parsed.get("root").unwrap();
        assert_eq!(root.get("key").unwrap().as_str().unwrap(), "value");
        assert_eq!(root.get("number").unwrap().as_str().unwrap(), "42");
    }
}
