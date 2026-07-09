import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import * as tauri from "../lib/tauri";

export function SettingsView() {
  const addGame = useAppStore((s) => s.addGame);
  const rescanLibrary = useAppStore((s) => s.rescanLibrary);
  const refreshAllMetadata = useAppStore((s) => s.refreshAllMetadata);
  const addToast = useAppStore((s) => s.addToast);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    tauri.hasIgdbCredentials().then(setHasCredentials).catch(() => {});
  }, []);

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      addToast("Enter both client ID and secret", "error");
      return;
    }
    try {
      await tauri.setIgdbCredentials(clientId.trim(), clientSecret.trim());
      setHasCredentials(true);
      setClientId("");
      setClientSecret("");
      addToast("IGDB credentials saved", "success");
    } catch (e) {
      addToast(`Failed to save credentials: ${e}`, "error");
    }
  };

  const handleAddGame = async () => {
    const path = await tauri.pickExeFile();
    if (path) {
      addGame(path);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-6 max-w-2xl">
      <h2 className="text-xl font-bold text-white mb-8">Settings</h2>

      <section className="mb-10">
        <h3 className="text-sm font-semibold text-white mb-1">IGDB API Credentials</h3>
        <p className="text-xs text-muted mb-4">
          Used to fetch game cover art and metadata. Create a free account at{" "}
          <span className="text-accent">igdb.com/api</span> to get credentials.
        </p>
        {hasCredentials && (
          <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-sm text-green-400">Credentials are set</span>
          </div>
        )}
        <div className="space-y-3">
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Client ID"
            className="w-full px-4 py-2.5 bg-base border border-base-border rounded-lg
              text-sm text-white placeholder-muted/50
              focus:outline-none focus:border-accent/50
              transition-colors"
          />
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Client Secret"
            className="w-full px-4 py-2.5 bg-base border border-base-border rounded-lg
              text-sm text-white placeholder-muted/50
              focus:outline-none focus:border-accent/50
              transition-colors"
          />
          <button
            onClick={handleSaveCredentials}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium
              hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
          >
            Save Credentials
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h3 className="text-sm font-semibold text-white mb-1">Library Management</h3>
        <p className="text-xs text-muted mb-4">Scan for new games or add a game manually.</p>
        <div className="flex gap-3">
          <button
            onClick={() => rescanLibrary()}
            className="px-4 py-2 bg-base-panel border border-base-border rounded-lg
              text-sm text-white/80 hover:text-white hover:border-white/15
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
              transition-colors"
          >
            Rescan Library
          </button>
          <button
            onClick={handleAddGame}
            className="px-4 py-2 bg-base-panel border border-base-border rounded-lg
              text-sm text-white/80 hover:text-white hover:border-white/15
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
              transition-colors"
          >
            Add Game (.exe)
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h3 className="text-sm font-semibold text-white mb-1">Metadata</h3>
        <p className="text-xs text-muted mb-4">Fetch cover art and info for all games missing metadata.</p>
        <button
          onClick={() => refreshAllMetadata()}
          className="px-4 py-2 bg-base-panel border border-base-border rounded-lg
            text-sm text-white/80 hover:text-white hover:border-white/15
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
            transition-colors"
        >
          Fetch All Metadata
        </button>
      </section>
    </div>
  );
}
