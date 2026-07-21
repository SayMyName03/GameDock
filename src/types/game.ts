export type GameSource = "steam" | "epic" | "manual";
export type SortOption = "recent" | "alphabetical" | "playtime";
export type ViewName = "library" | "favorites" | "settings";

export interface PlatformInfo {
  id: string;
  name: string;
  description: string;
}

export interface GameDto {
  id: number;
  title: string;
  source: GameSource;
  sourceId: string | null;
  exePath: string | null;
  coverPath: string | null;
  isFavorite: boolean;
  lastPlayed: number | null;
  totalPlayedSeconds: number;
  description: string | null;
  genres: string | null;
}

export interface PlaySessionDto {
  sessionId: number;
  gameId: number;
  startedAt: number;
}
