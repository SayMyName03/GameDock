import type { ViewName } from "../types/game";

interface NavItemProps {
  label: string;
  icon: string;
  view: ViewName;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ label, icon, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-4 py-3 rounded-lg
        text-sm font-medium transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        ${active
          ? "bg-accent/10 text-accent"
          : "text-muted hover:text-white hover:bg-white/5"
        }
      `}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
