import { create } from "zustand";
import type { GameDto, GameSource, SortOption, ViewName, PlatformInfo } from "../types/game";
import * as tauri from "../lib/tauri";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success";
}

interface AppStore {
  games: GameDto[];
  selectedGameId: number | null;
  runningGameId: number | null;
  activeView: ViewName;
  sourceFilter: GameSource | null;
  searchQuery: string;
  sortBy: SortOption;
  isScanning: boolean;
  isRefreshingMetaData: boolean;
  toasts: Toast[];

  setupComplete: boolean;
  availablePlatforms: PlatformInfo[];
  enabledPlatforms: string[];

  loadGames: () => Promise<void>;
  initLibrary: () => Promise<void>;
  selectGame: (id: number | null) => void;
  setActiveView: (view: ViewName) => void;
  setSourceFilter: (source: GameSource | null) => void;
  setSearch: (query: string) => void;
  setSort: (sortBy: SortOption) => void;
  toggleFavorite: (id: number) => Promise<void>;
  launchGame: (id: number) => Promise<void>;
  rescanLibrary: () => Promise<void>;
  addGame: (exePath: string) => Promise<void>;
  removeGame: (id: number) => Promise<void>;
  refreshMetadata: (id: number) => Promise<void>;
  refreshAllMetadata: () => Promise<void>;
  setRunningGame: (id: number | null) => void;
  addToast: (message: string, type?: "error" | "success") => void;
  removeToast: (id: number) => void;

  loadPlatforms: () => Promise<void>;
  setEnabledPlatforms: (platforms: string[]) => Promise<void>;
  completeSetup: () => Promise<void>;
}

let toastIdCounter = 0;

export const useAppStore = create<AppStore>((set, get) => ({
  games: [],
  selectedGameId: null,
  runningGameId: null,
  activeView: "library",
  sourceFilter: null,
  searchQuery: "",
  sortBy: "recent",
  isScanning: false,
  isRefreshingMetaData: false,
  toasts: [],

  setupComplete: false,
  availablePlatforms: [],
  enabledPlatforms: [],

  loadPlatforms: async () => {
    try {
      const [platforms, enabled, done] = await Promise.all([
        tauri.getPlatforms(),
        tauri.getEnabledPlatforms(),
        tauri.isSetupDone(),
      ]);
      set({
        availablePlatforms: platforms,
        enabledPlatforms: enabled,
        setupComplete: done,
      });
    } catch (e) {
      get().addToast(`Failed to load platforms: ${e}`, "error");
    }
  },

  setEnabledPlatforms: async (platforms) => {
    try {
      await tauri.setEnabledPlatforms(platforms);
      set({ enabledPlatforms: platforms });
      get().addToast("Platform settings saved", "success");
    } catch (e) {
      get().addToast(`Failed to save platforms: ${e}`, "error");
    }
  },

  completeSetup: async () => {
    const { enabledPlatforms } = get();
    try {
      await tauri.setEnabledPlatforms(enabledPlatforms);
      set({ setupComplete: true, isScanning: true });
      await tauri.scanGames();
      await tauri.fetchAllMetadata();
      await get().loadGames();
    } catch (e) {
      get().addToast(`Setup failed: ${e}`, "error");
    } finally {
      set({ isScanning: false });
    }
  },

  loadGames: async () => {
    try {
      const games = await tauri.getGames();
      set({ games });
    } catch (e) {
      get().addToast(`Failed to load games: ${e}`, "error");
    }
  },

  selectGame: (id) => set({ selectedGameId: id }),

  setActiveView: (view) => set({ activeView: view, sourceFilter: null }),

  setSourceFilter: (source) => set({ sourceFilter: source, activeView: "library" }),

  setSearch: (query) => set({ searchQuery: query }),

  setSort: (sortBy) => set({ sortBy }),

  toggleFavorite: async (id) => {
    try {
      await tauri.toggleFavorite(id);
      await get().loadGames();
    } catch (e) {
      get().addToast(`Failed to toggle favorite: ${e}`, "error");
    }
  },

  launchGame: async (id) => {
    try {
      await tauri.launchGame(id);
      set({ runningGameId: id });
    } catch (e) {
      get().addToast(`Failed to launch game: ${e}`, "error");
    }
  },

  initLibrary: async() => {
    set({ isScanning: true });
    try{
      await tauri.scanGames();
      await tauri.fetchAllMetadata();
      await get().loadGames();
    } catch(e){
      get().addToast(`Startup sync failed: ${e}`, "error");
    } finally {
      set({ isScanning: false });
    }
  },

  rescanLibrary: async () => {
    set({ isScanning: true });
    try {
      await tauri.scanGames();
      await get().loadGames();
      get().addToast("Library scan complete", "success");
    } catch (e) {
      get().addToast(`Scan failed: ${e}`, "error");
    } finally {
      set({ isScanning: false });
    }
  },

  addGame: async (exePath) => {
    try {
      await tauri.addManualGame(exePath);
      await get().loadGames();
      get().addToast("Game added", "success");
    } catch (e) {
      get().addToast(`Failed to add game: ${e}`, "error");
    }
  },

  removeGame: async (id) => {
    try {
      await tauri.removeManualGame(id);
      set({ selectedGameId: null });
      await get().loadGames();
      get().addToast("Game removed", "success");
    } catch (e) {
      get().addToast(`Failed to remove game: ${e}`, "error");
    }
  },

  refreshMetadata: async (id) => {
    set({ isRefreshingMetaData: true });

    try {
      await tauri.fetchMetadata(id);
      await get().loadGames();
      get().addToast("Metadata is already upto date!", "success");
    } catch (e) {
      get().addToast(`Metadata fetch failed: ${e}`, "error");
    } finally{
      set({ isRefreshingMetaData:false })
    }
  },

  refreshAllMetadata: async () => {
    try {
      await tauri.fetchAllMetadata();
      await get().loadGames();
      get().addToast("Metadata updated", "success");
    } catch (e) {
      get().addToast(`Metadata update failed: ${e}`, "error");
    }
  },

  setRunningGame: (id) => set({ runningGameId: id }),

  addToast: (message, type = "error") => {
    const id = ++toastIdCounter;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
