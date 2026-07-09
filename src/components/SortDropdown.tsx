import type { SortOption } from "../types/game";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="px-3 py-2 bg-base-panel border border-base-border rounded-lg
        text-sm text-white
        focus:outline-none focus:border-accent/50
        focus-visible:ring-2 focus-visible:ring-accent/50
        transition-colors cursor-pointer"
    >
      <option value="recent">Recently Played</option>
      <option value="alphabetical">Alphabetical</option>
      <option value="playtime">Play Time</option>
    </select>
  );
}
