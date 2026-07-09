use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameDto {
    pub id: i64,
    pub title: String,
    pub source: String,
    pub source_id: Option<String>,
    pub exe_path: Option<String>,
    pub cover_path: Option<String>,
    pub is_favorite: bool,
    pub last_played: Option<i64>,
    pub total_played_seconds: i64,
    pub description: Option<String>,
    pub genres: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaySessionDto {
    pub session_id: i64,
    pub game_id: i64,
    pub started_at: i64,
}

#[derive(Debug, Clone)]
pub struct GameRow {
    pub id: i64,
    pub title: String,
    pub source: String,
    pub source_id: Option<String>,
    pub exe_path: Option<String>,
    pub install_dir: Option<String>,
    pub cover_path: Option<String>,
    pub is_favorite: bool,
    pub last_played: Option<i64>,
    pub total_played_seconds: i64,
    pub igdb_id: Option<i64>,
    pub description: Option<String>,
    pub genres: Option<String>,
    pub created_at: i64,
}

impl GameRow {
    pub fn to_dto(&self) -> GameDto {
        GameDto {
            id: self.id,
            title: self.title.clone(),
            source: self.source.clone(),
            source_id: self.source_id.clone(),
            exe_path: self.exe_path.clone(),
            cover_path: self.cover_path.clone(),
            is_favorite: self.is_favorite,
            last_played: self.last_played,
            total_played_seconds: self.total_played_seconds,
            description: self.description.clone(),
            genres: self.genres.clone(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ScannedGame {
    pub title: String,
    pub source: String,
    pub source_id: Option<String>,
    pub exe_path: Option<String>,
    pub install_dir: Option<String>,
}
