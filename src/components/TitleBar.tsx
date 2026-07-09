import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const win = getCurrentWindow();

  useEffect(() => {
    win.isMaximized().then(setIsMaximized);
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="h-9 bg-base-panel border-b border-base-border flex items-center justify-between flex-shrink-0 select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 px-4">
        <span data-tauri-drag-region className="text-xs text-muted/50 font-medium tracking-wide">
          Game Launcher
        </span>
      </div>

      <div data-tauri-drag-region className="flex h-full">
        <button
          onClick={() => win.minimize()}
          className="w-11 h-full flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        <button
          onClick={() => win.toggleMaximize().then(() => win.isMaximized().then(setIsMaximized))}
          className="w-11 h-full flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="3" y="0.5" width="8.5" height="8.5" rx="1" stroke="currentColor" fill="none" />
              <rect x="0.5" y="3" width="8.5" height="8.5" rx="1" stroke="currentColor" fill="none" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" fill="none" />
            </svg>
          )}
        </button>

        <button
          onClick={() => win.close()}
          className="w-11 h-full flex items-center justify-center text-muted hover:text-white hover:bg-red-500/80 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
