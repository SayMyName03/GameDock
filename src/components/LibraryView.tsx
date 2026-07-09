import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { filterAndSortGames } from "../lib/format";
import { Toolbar } from "./Toolbar";
import { GameGrid } from "./GameGrid";

export function LibraryView() {
  const games = useAppStore((s) => s.games);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const sortBy = useAppStore((s) => s.sortBy);
  const activeView = useAppStore((s) => s.activeView);
  const sourceFilter = useAppStore((s) => s.sourceFilter);

  const favoritesOnly = activeView === "favorites";

  const displayGames = useMemo(
    () => filterAndSortGames(games, searchQuery, sortBy, favoritesOnly, sourceFilter),
    [games, searchQuery, sortBy, favoritesOnly, sourceFilter]
  );

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <Toolbar />
      <GameGrid games={displayGames} />
    </div>
  );
}
