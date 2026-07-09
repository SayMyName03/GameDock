import type { GameDto } from "../types/game";
import { GameCard } from "./GameCard";

interface GameGridProps {
  games: GameDto[];
}

export function GameGrid({ games }: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted">
        <p className="text-lg mb-2">No games found</p>
        <p className="text-sm">Try rescanning your library</p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 pb-6"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      }}
    >
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
