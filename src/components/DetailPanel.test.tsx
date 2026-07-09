import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailPanel } from "./DetailPanel";

vi.mock("../store/useAppStore", () => ({
  useAppStore: (selector: (s: any) => any) =>
    selector({
      selectedGameId: 1,
      selectGame: vi.fn(),
      games: [
        { id: 1, title: "Dota 2", source: "steam", sourceId: "570", exePath: null, coverPath: null, isFavorite: true, lastPlayed: 1700000000, totalPlayedSeconds: 3600, description: "A great game", genres: "MOBA, Strategy" },
      ],
      removeGame: vi.fn(),
      refreshMetadata: vi.fn(),
      runningGameId: null,
    }),
}));

describe("DetailPanel", () => {
  it("renders game details when a game is selected", () => {
    render(<DetailPanel />);
    expect(screen.getByText("Dota 2")).toBeDefined();
    expect(screen.getByText("A great game")).toBeDefined();
    expect(screen.getByText("MOBA, Strategy")).toBeDefined();
  });

  it("renders play button", () => {
    render(<DetailPanel />);
    expect(screen.getByText("Play")).toBeDefined();
  });
});
