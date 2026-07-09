import type { GameDto, GameSource, SortOption } from "../types/game";

export function formatPlayTime(seconds: number): string {
  if (seconds < 60) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export function formatLastPlayed(timestamp: number | null): string {
  if (!timestamp) return "Never";
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor(diff / 60);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function getGameCounts(games: GameDto[]) {
  return {
    total: games.length,
    steam: games.filter((g) => g.source === "steam").length,
    epic: games.filter((g) => g.source === "epic").length,
    manual: games.filter((g) => g.source === "manual").length,
  };
}

export function filterAndSortGames(
  games: GameDto[],
  query: string,
  sortBy: SortOption,
  favoritesOnly: boolean,
  sourceFilter: GameSource | null
): GameDto[] {
  let result = [...games];

  if (favoritesOnly) {
    result = result.filter((g) => g.isFavorite);
  }

  if (sourceFilter) {
    result = result.filter((g) => g.source === sourceFilter);
  }

  if (query.trim()) {
    const lower = query.toLowerCase();
    result = result.filter((g) => g.title.toLowerCase().includes(lower));
  }

  switch (sortBy) {
    case "recent":
      result.sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
      break;
    case "alphabetical":
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "playtime":
      result.sort((a, b) => b.totalPlayedSeconds - a.totalPlayedSeconds);
      break;
  }

  return result;
}
