import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import * as tauri from "../lib/tauri";

export function useTauriEvents() {
  const loadGames = useAppStore((s) => s.loadGames);
  const setRunningGame = useAppStore((s) => s.setRunningGame);

  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    async function setup() {
      // Each helper registers a Tauri listener and returns the unlisten callback
      // after an IPC round-trip. If the component unmounts before that resolves,
      // `.push` below would push to an orphaned array. We register the callback
      // immediately and, on cancel taken after resolve, drop it right away.
      const unlistenLaunched = await tauri.onGameLaunched((gameId) => {
        if (cancelled) return;
        setRunningGame(gameId);
      });
      if (cancelled) {
        unlistenLaunched();
        return;
      }
      unlisteners.push(unlistenLaunched);

      const unlistenExited = await tauri.onGameExited(() => {
        if (cancelled) return;
        setRunningGame(null);
        loadGames();
      });
      if (cancelled) {
        unlistenExited();
        return;
      }
      unlisteners.push(unlistenExited);

      const unlistenMetadata = await tauri.onMetadataFetched(() => {
        if (cancelled) return;
        loadGames();
      });
      if (cancelled) {
        unlistenMetadata();
        return;
      }
      unlisteners.push(unlistenMetadata);
    }

    setup();

    return () => {
      cancelled = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [loadGames, setRunningGame]);
}