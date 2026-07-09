use crate::models::ScannedGame;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct EpicManifest {
    app_name: String,
    display_name: String,
    install_location: String,
    launch_executable: String,
}

pub fn scan_epic() -> Result<Vec<ScannedGame>, String> {
    let manifests_dir = PathBuf::from("C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests");
    if !manifests_dir.exists() {
        return Ok(Vec::new());
    }

    let mut games = Vec::new();
    for entry in fs::read_dir(&manifests_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let filename = entry.file_name().to_string_lossy().to_string();

        if filename.ends_with(".item") {
            let content = fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
            if let Ok(manifest) = serde_json::from_str::<EpicManifest>(&content) {
                let exe_path = PathBuf::from(&manifest.install_location)
                    .join(&manifest.launch_executable)
                    .to_string_lossy()
                    .to_string();

                games.push(ScannedGame {
                    title: manifest.display_name,
                    source: "epic".to_string(),
                    source_id: Some(manifest.app_name),
                    exe_path: Some(exe_path),
                    install_dir: Some(manifest.install_location),
                });
            }
        }
    }

    Ok(games)
}

pub fn parse_manifest(content: &str) -> Result<ScannedGame, String> {
    let manifest: EpicManifest = serde_json::from_str(content).map_err(|e| e.to_string())?;
    let exe_path = PathBuf::from(&manifest.install_location)
        .join(&manifest.launch_executable)
        .to_string_lossy()
        .to_string();

    Ok(ScannedGame {
        title: manifest.display_name,
        source: "epic".to_string(),
        source_id: Some(manifest.app_name),
        exe_path: Some(exe_path),
        install_dir: Some(manifest.install_location),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_epic_manifest() {
        let content = std::fs::read_to_string("tests/fixtures/epic_manifest.item").unwrap();
        let game = parse_manifest(&content).unwrap();
        assert_eq!(game.title, "Fortnite");
        assert_eq!(game.source, "epic");
        assert_eq!(game.source_id, Some("Fortnite".to_string()));
        assert_eq!(
            game.install_dir,
            Some("C:\\Program Files\\Epic Games\\Fortnite".to_string())
        );
        assert!(game.exe_path.as_ref().unwrap().contains("FortniteClient"));
    }
}
