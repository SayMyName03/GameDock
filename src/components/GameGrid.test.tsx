import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameGrid } from "./GameGrid";
import type { GameDto } from "../types/game";

vi.mock("../store/useAppStore", () => ({
  useAppStore: () => ({
    selectGame: vi.fn(),
    toggleFavorite: vi.fn(),
    runningGameId: null,
  }),
}));

describe("GameGrid", () => {
  const mockGames: GameDto[] = [
    { id: 1, title: "Dota 2", source: "steam", sourceId: "570", exePath: null, coverPath: null, isFavorite: false, lastPlayed: null, totalPlayedSeconds: 0, description: null, genres: null },
    { id: 2, title: "Celeste", source: "manual", sourceId: null, exePath: "C:/celeste.exe", coverPath: null, isFavorite: false, lastPlayed: null, totalPlayedSeconds: 0, description: null, genres: null },
  ];

  it("renders a card for each game", () => {
    render(<GameGrid games={mockGames} />);
    expect(screen.getByText("Dota 2")).toBeDefined();
    expect(screen.getByText("Celeste")).toBeDefined();
  });

  it("shows empty state when no games", () => {
    render(<GameGrid games={[]} />);
    expect(screen.getByText("No games found")).toBeDefined();
  });
});
