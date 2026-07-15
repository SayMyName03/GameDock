import { useState } from "react";
import {
  Gamepad2,
  Star,
  Settings,
  FileCode,
  ChevronRight,
} from "lucide-react";
import { SiSteam, SiEpicgames } from "react-icons/si";
import { useAppStore } from "../store/useAppStore";
import { getGameCounts } from "../lib/format";
import type { GameSource } from "../types/game";

type NavItem = {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavItem[];
};

type NavGroup = {
  heading?: string;
  items: NavItem[];
};

function NavItemRow({
  item,
  active,
  level = 0,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  level?: number;
  onSelect: (id: string) => void;
}) {
  const hasChildren = !!item.children;
  const [isOpen, setIsOpen] = useState(false);
  const isBrandIcon = item.id === "source-steam" || item.id === "source-epic";

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item.id);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div
        className={`group flex items-center justify-between pr-2.5 py-[7px] rounded-r-[4px] cursor-pointer transition-all duration-300 select-none border-l-[3px] ${active
          ? "border-accent bg-accent/10 text-accent font-medium shadow-[0_0_15px_rgba(0,240,255,0.05)]"
          : "border-transparent text-white/50 hover:bg-white/5 hover:border-accent/50 hover:text-white"
          }`}
        style={{ paddingLeft: `${level * 12 + 7}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2.5">
          <item.icon
            className={`w-4 h-4 transition-all duration-300 ${isBrandIcon
              ? (active ? "fill-accent text-accent" : "fill-white/90 text-white/90 group-hover:fill-accent group-hover:text-accent")
              : (active ? "text-accent" : "text-white/80 group-hover:text-white")
              }`}
            strokeWidth={1.75}
          />
          <span className="text-[13px] tracking-wide truncate">{item.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {item.badge !== undefined && (
            <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-medium rounded-sm border transition-all duration-300 ${active
              ? "bg-accent/20 border-accent/50 text-accent shadow-[0_0_8px_rgba(0,240,255,0.3)]"
              : "bg-white/5 border-white/10 text-white/50 group-hover:border-accent/30 group-hover:text-accent/70"
              }`}>
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight
              className={`w-3.5 h-3.5 text-white/70 group-hover:text-accent transition-transform duration-200 ${isOpen ? "rotate-90" : ""
                }`}
              strokeWidth={2}
            />
          )}
        </div>
      </div>

      {hasChildren && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
        >
          <div className="overflow-hidden min-h-0 flex flex-col gap-0.5 mt-0.5">
            {item.children!.map((child) => (
              <NavItemRow
                key={child.id}
                item={child}
                active={active}
                level={level + 1}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const sourceFilter = useAppStore((s) => s.sourceFilter);
  const setSourceFilter = useAppStore((s) => s.setSourceFilter);
  const games = useAppStore((s) => s.games);

  const counts = getGameCounts(games);

  const handleSelect = (id: string) => {
    if (id.startsWith("source-")) {
      const source = id.replace("source-", "") as GameSource | "all";
      setSourceFilter(source === "all" ? null : source);
    } else {
      setActiveView(id as "library" | "favorites" | "settings");
    }
  };


  const navGroups: NavGroup[] = [
    {
      heading: "Main",
      items: [
        {
          id: "library",
          title: "Library",
          icon: Gamepad2,
          badge: counts.total || undefined,
        },
        { id: "favorites", title: "Favorites", icon: Star },
      ],
    },
    {
      heading: "Sources",
      items: [
        { id: "source-all", title: "All Games", icon: Gamepad2 },
        { id: "source-steam", title: "Steam", icon: SiSteam, badge: counts.steam || undefined },
        { id: "source-epic", title: "Epic Games", icon: SiEpicgames, badge: counts.epic || undefined },
        { id: "source-manual", title: "Manual", icon: FileCode, badge: counts.manual || undefined },
      ],
    },
  ];

  const isActive = (id: string) => {
    if (id.startsWith("source-")) {
      const source = id.replace("source-", "") as GameSource | "all";
      if (source === "all") return sourceFilter === null;
      return sourceFilter === source;
    }
    return activeView === id;
  };

  return (
    <div className="w-56 h-full bg-[#0D0D10] border-r border-white/5 flex flex-col py-4 px-3">
      <div className="px-2.5 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 bg-accent flex items-center justify-center font-black text-[15px] text-[#0D0D10] tracking-tight"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)" }}
          >
            G
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-extrabold tracking-[0.08em] leading-none text-white uppercase">
              GAME<span className="text-accent/90">DOCK</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col gap-4">
        {navGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            {group.heading && (
              <span className="px-2.5 mb-1 text-[10px] font-bold tracking-[0.2em] text-accent/50 uppercase">
                {group.heading}
              </span>
            )}
            {group.items.map((item) => (
              <NavItemRow
                key={item.id}
                item={item}
                active={isActive(item.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-0.5">
        <div
          className={`group flex items-center gap-2.5 pr-2.5 py-[7px] rounded-r-[4px] cursor-pointer transition-all duration-300 select-none border-l-[3px] ${activeView === "settings"
            ? "border-accent bg-accent/10 text-accent font-medium shadow-[0_0_15px_rgba(0,240,255,0.05)]"
            : "border-transparent text-white/80 hover:bg-white/5 hover:border-accent/50 hover:text-white"
            }`}
          style={{ paddingLeft: "7px" }}
          onClick={() => handleSelect("settings")}
        >
          <Settings
            className={`w-4 h-4 transition-all duration-300 ${activeView === "settings"
              ? "text-accent"
              : "text-white/70 group-hover:text-white"
              }`}
            strokeWidth={1.5}
          />
          <span className="text-[13px] tracking-wide">Settings</span>
        </div>
      </div>
    </div>
  );
}
