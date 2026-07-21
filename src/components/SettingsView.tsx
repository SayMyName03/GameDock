import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import * as tauri from "../lib/tauri";
import { SiSteam, SiEpicgames } from "react-icons/si";
import { FileCode } from "lucide-react";

const platformIcons: Record<string, React.ElementType> = {
  steam: SiSteam,
  epic: SiEpicgames,
  manual: FileCode,
};

export function SettingsView() {
  const addGame = useAppStore((s) => s.addGame);
  const rescanLibrary = useAppStore((s) => s.rescanLibrary);
  const refreshAllMetadata = useAppStore((s) => s.refreshAllMetadata);
  const addToast = useAppStore((s) => s.addToast);
  const availablePlatforms = useAppStore((s) => s.availablePlatforms);
  const enabledPlatforms = useAppStore((s) => s.enabledPlatforms);
  const setEnabledPlatforms = useAppStore((s) => s.setEnabledPlatforms);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [localEnabled, setLocalEnabled] = useState<Set<string>>(new Set());

  useEffect(() => {
    tauri.hasIgdbCredentials().then(setHasCredentials).catch(() => {});
  }, []);

  useEffect(() => {
    setLocalEnabled(new Set(enabledPlatforms));
  }, [enabledPlatforms]);

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
    let path: string | null = null;
    try {
      path = await tauri.pickExeFile();
    } catch (e) {
      addToast(`Failed to open file picker: ${e}`, "error");
      return;
    }
    if (path) {
      addGame(path);
    }
  };

  const togglePlatform = (id: string) => {
    setLocalEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSavePlatforms = async () => {
    const platforms = Array.from(localEnabled);
    await setEnabledPlatforms(platforms);
    addToast("Platforms updated. Rescan to refresh your library.", "success");
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-6 max-w-2xl">
      <h2 className="text-xl font-bold text-white mb-8">Settings</h2>

      <section className="mb-10">
        <h3 className="text-sm font-semibold text-white mb-1">Platforms</h3>
        <p className="text-xs text-muted mb-4">
          Enable or disable game platform scanners. Disabled platforms will be skipped during scans.
        </p>

        <div className="space-y-2">
          {availablePlatforms.filter((p) => p.id !== "manual").map((platform) => {
            const Icon = platformIcons[platform.id];
            const isEnabled = localEnabled.has(platform.id);
            return (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all duration-200 text-left ${
                  isEnabled
                    ? "border-accent/50 bg-accent/10 text-white"
                    : "border-base-border bg-base-panel text-white/60 hover:border-white/20 hover:text-white/80"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isEnabled ? "bg-accent/20" : "bg-white/5"
                }`}>
                  {Icon && (
                    <Icon
                      className={`w-4 h-4 ${isEnabled ? "text-accent" : "text-white/50"}`}
                      strokeWidth={1.5}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{platform.name}</div>
                </div>
                <div className={`text-xs font-medium px-2 py-0.5 rounded ${
                  isEnabled
                    ? "text-accent bg-accent/15"
                    : "text-white/30 bg-white/5"
                }`}>
                  {isEnabled ? "Active" : "Disabled"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-base-panel border border-base-border">
          <FileCode className="w-4 h-4 text-white/40" strokeWidth={1.5} />
          <span className="text-xs text-white/50">Manual games can always be added regardless of platform selection.</span>
        </div>

        <button
          onClick={handleSavePlatforms}
          disabled={Array.from(localEnabled).length === 0}
          className="mt-3 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium
            hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
        >
          Save Platforms
        </button>
      </section>

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
