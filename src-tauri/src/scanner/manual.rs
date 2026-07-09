use crate::models::ScannedGame;

pub fn add_manual_game(exe_path: &str) -> Result<ScannedGame, String> {
    let path = std::path::Path::new(exe_path);
    let filename = path
        .file_stem()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();
    let title = filename.replace("_", " ").replace(".", " ");
    Ok(ScannedGame {
        title,
        source: "manual".to_string(),
        source_id: None,
        exe_path: Some(exe_path.to_string()),
        install_dir: Some(
            path.parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default(),
        ),
    })
}
