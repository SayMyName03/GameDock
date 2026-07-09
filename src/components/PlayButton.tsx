import { useAppStore } from "../store/useAppStore";

interface PlayButtonProps {
  gameId: number;
}

export function PlayButton({ gameId }: PlayButtonProps) {
  const launchGame = useAppStore((s) => s.launchGame);
  const runningGameId = useAppStore((s) => s.runningGameId);

  const isRunning = runningGameId === gameId;
  const isOtherRunning = runningGameId !== null && runningGameId !== gameId;

  return (
    <button
      onClick={() => !isRunning && !isOtherRunning && launchGame(gameId)}
      disabled={isRunning || isOtherRunning}
      className={`
        w-full py-4 rounded-xl text-base font-semibold transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        ${isRunning
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : isOtherRunning
          ? "bg-base-panel text-muted cursor-not-allowed border border-base-border"
          : "bg-accent text-white hover:bg-accent-hover active:scale-[0.98]"
        }
      `}
    >
      {isRunning ? "Running..." : isOtherRunning ? "Another game is running" : "Play"}
    </button>
  );
}
