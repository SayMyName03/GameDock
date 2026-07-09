import { useAppStore } from "../store/useAppStore";
import { SearchInput } from "./SearchInput";
import { SortDropdown } from "./SortDropdown";

export function Toolbar() {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearch = useAppStore((s) => s.setSearch);
  const sortBy = useAppStore((s) => s.sortBy);
  const setSort = useAppStore((s) => s.setSort);
  const isScanning = useAppStore((s) => s.isScanning);
  const rescanLibrary = useAppStore((s) => s.rescanLibrary);
  const games = useAppStore((s) => s.games);

  return (
    <div className="flex items-center gap-4 mb-6">
      <SearchInput value={searchQuery} onChange={setSearch} />
      <SortDropdown value={sortBy} onChange={setSort} />
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-muted">{games.length} games</span>
        <button
          onClick={() => rescanLibrary()}
          disabled={isScanning}
          className="px-4 py-2 bg-base-panel border border-base-border rounded-lg
            text-sm text-white/80 hover:text-white hover:border-white/15
            disabled:opacity-50 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
            transition-colors"
        >
          {isScanning ? "Scanning..." : "Rescan"}
        </button>
      </div>
    </div>
  );
}
