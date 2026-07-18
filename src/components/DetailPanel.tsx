import { useAppStore } from "../store/useAppStore";
import { CoverImage } from "./CoverImage";
import { PlayButton } from "./PlayButton";
import { formatPlayTime, formatLastPlayed } from "../lib/format";
import { Loader2 } from "lucide-react";

export function DetailPanel() {
  const selectedGameId = useAppStore((s) => s.selectedGameId);
  const selectGame = useAppStore((s) => s.selectGame);
  const games = useAppStore((s) => s.games);
  const removeGame = useAppStore((s) => s.removeGame);
  const refreshMetadata = useAppStore((s) => s.refreshMetadata);
  const isRefreshingMetaData = useAppStore((s) => s.isRefreshingMetaData);

  const game = games.find((g) => g.id === selectedGameId);

  if (!game) return null;

  return (
    <>
      <div
        className="absolute inset-0 bg-black/50 z-10 animate-fade-in"
        onClick={() => selectGame(null)}
      />
      <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-base-panel border-l border-base-border z-20 overflow-y-auto animate-slide-in">
        <div className="p-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => selectGame(null)}
              className="text-muted hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
            >
              x
            </button>
          </div>
          <div className="flex gap-5 mb-6">
            <CoverImage
              gameId={game.id}
              coverPath={game.coverPath}
              alt={game.title}
              className="w-40 aspect-[3/4] rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-1">{game.title}</h2>
              {game.genres && (
                <p className="text-sm text-muted mb-2">{game.genres}</p>
              )}
              <p className="text-xs text-muted/60 capitalize mb-3">{game.source}</p>
              <div className="text-sm text-white/70 space-y-1">
                <p>{formatPlayTime(game.totalPlayedSeconds)} played</p>
                <p>Last: {formatLastPlayed(game.lastPlayed)}</p>
              </div>
            </div>
          </div>
          {game.description && (
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              {game.description}
            </p>
          )}
          <div className="space-y-3">
            <PlayButton gameId={game.id} />
            <button
              onClick={() => refreshMetadata(game.id)}
              disabled={isRefreshingMetaData}
              className={`w-full py-2.5 rounded-lg border text-sm
              flex items-center justify-center gap-2
              transition-colors${isRefreshingMetaData ? "bg-base border-base-border text-white/50 cursor-not-allowed"
                      : "bg-base border-base-border text-white/70 hover:text-white hover:border-white/15"
                      }
                  `}
            >
              {isRefreshingMetaData ? (
                <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing...
                </>
              ): (
                "Refresh Metadata"
              )}
            </button>
            {game.source === "manual" && (
              <button
                onClick={() => removeGame(game.id)}
                className="w-full py-2.5 bg-base border border-red-500/20 rounded-lg
                  text-sm text-red-400/80 hover:text-red-400 hover:border-red-500/40
                  transition-colors"
              >
                Remove from Library
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
