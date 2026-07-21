import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { SiSteam, SiEpicgames } from "react-icons/si";
import { FileCode, Check } from "lucide-react";
const platformIcons: Record<string, React.ElementType> = {
  steam: SiSteam,
  epic: SiEpicgames,
  manual: FileCode,
};

export function SetupView() {
  const availablePlatforms = useAppStore((s) => s.availablePlatforms);
  const loadPlatforms = useAppStore((s) => s.loadPlatforms);
  const setEnabledPlatforms = useAppStore((s) => s.setEnabledPlatforms);
  const completeSetup = useAppStore((s) => s.completeSetup);
  const isScanning = useAppStore((s) => s.isScanning);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatforms().finally(() => setLoading(false));
  }, [loadPlatforms]);

  useEffect(() => {
    if (availablePlatforms.length > 0) {
      setSelected(new Set(availablePlatforms.map((p) => p.id)));
    }
  }, [availablePlatforms]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStart = async () => {
    const platforms = Array.from(selected);
    await setEnabledPlatforms(platforms);
    await completeSetup();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-base">
        <div className="text-muted text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-base">
      <div className="max-w-lg w-full px-6">
        <div className="mb-8 text-center">
          <div
            className="w-12 h-12 bg-accent flex items-center justify-center font-black text-xl text-[#0D0D10] tracking-tight mx-auto mb-4"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)" }}
          >
            G
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            Welcome to <span className="text-accent/90">GAMEDOCK</span>
          </h1>
          <p className="text-sm text-muted mt-2">
            Choose which game platforms to scan. You can change this later in Settings.
          </p>
        </div>

        <div className="space-y-2">
          {availablePlatforms.filter((p) => p.id !== "manual").map((platform) => {
            const Icon = platformIcons[platform.id];
            const isSelected = selected.has(platform.id);
            return (
              <button
                key={platform.id}
                onClick={() => toggle(platform.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200 text-left ${
                  isSelected
                    ? "border-accent/50 bg-accent/10 text-white"
                    : "border-base-border bg-base-panel text-white/60 hover:border-white/20 hover:text-white/80"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? "bg-accent/20" : "bg-white/5"
                }`}>
                  {Icon && (
                    <Icon
                      className={`w-5 h-5 ${isSelected ? "text-accent" : "text-white/50"}`}
                      strokeWidth={1.5}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{platform.name}</div>
                  <div className="text-xs text-muted truncate">{platform.description}</div>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "border-accent bg-accent"
                    : "border-white/20"
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 px-5 py-3 rounded-xl bg-base-panel border border-base-border">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-white/40" strokeWidth={1.5} />
            <div className="text-sm text-white/60">
              <span className="text-white/80 font-medium">Manual</span> — Always available for adding games individually.
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={isScanning || Array.from(selected).filter((id) => id !== "manual").length === 0}
          className="mt-8 w-full px-6 py-3 bg-accent text-white rounded-xl text-sm font-bold
            hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
        >
          {isScanning ? "Scanning..." : "Get Started"}
        </button>

        {isScanning && (
          <p className="text-xs text-muted text-center mt-3">
            Scanning your game library...
          </p>
        )}
      </div>
    </div>
  );
}
