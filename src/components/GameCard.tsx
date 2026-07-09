import type { GameDto } from "../types/game";
import { useAppStore } from "../store/useAppStore";
import { CoverImage } from "./CoverImage";
import { formatPlayTime } from "../lib/format";

interface GameCardProps {
  game: GameDto;
}

export function GameCard({ game }: GameCardProps) {
  const selectGame = useAppStore((s) => s.selectGame);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const runningGameId = useAppStore((s) => s.runningGameId);

  const isRunning = runningGameId === game.id;

  return (
    <button
      onClick={() => selectGame(game.id)}
      className="group text-left transition-all duration-200 hover:-translate-y-1
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base rounded-xl"
    >
      <div className="relative rounded-xl overflow-hidden border border-base-border group-hover:border-white/15 transition-colors">
        <CoverImage
          gameId={game.id}
          coverPath={game.coverPath}
          alt={game.title}
          className="aspect-[3/4] w-full"
        />
        {isRunning && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
            <span className="text-xs text-green-400">Running</span>
          </div>
        )}
        <div className="absolute top-2 left-2 p-1 rounded-md bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <span
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(game.id);
            }}
            className="cursor-pointer text-sm"
          >
            {game.isFavorite ? "\u2605" : "\u2606"}
          </span>
        </div>
        {game.totalPlayedSeconds > 0 && (
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-xs text-white/70">{formatPlayTime(game.totalPlayedSeconds)}</span>
          </div>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
        {game.title}
      </h3>
      <p className="text-xs text-muted capitalize">{game.source}</p>
    </button>
  );
}
