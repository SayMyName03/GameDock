interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative flex-1 max-w-md">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search games..."
        className="w-full px-4 py-2 bg-base-panel border border-base-border rounded-lg
          text-sm text-white placeholder-muted/50
          focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
          focus-visible:ring-2 focus-visible:ring-accent/30
          transition-colors"
      />
    </div>
  );
}
