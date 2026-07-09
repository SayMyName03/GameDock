import { describe, it, expect } from "vitest";
import { formatPlayTime, formatLastPlayed, filterAndSortGames } from "./format";
import type { GameDto } from "../types/game";

describe("formatPlayTime", () => {
  it("formats 0 seconds", () => {
    expect(formatPlayTime(0)).toBe("0m");
  });

  it("formats seconds only", () => {
    expect(formatPlayTime(30)).toBe("0m");
  });

  it("formats minutes", () => {
    expect(formatPlayTime(600)).toBe("10m");
  });

  it("formats hours and minutes", () => {
    expect(formatPlayTime(7380)).toBe("2h 3m");
  });

  it("formats hours only", () => {
    expect(formatPlayTime(7200)).toBe("2h");
  });
});

describe("formatLastPlayed", () => {
  it("returns Never for null", () => {
    expect(formatLastPlayed(null)).toBe("Never");
  });

  it("returns Just now for recent timestamp", () => {
    const now = Date.now() / 1000;
    expect(formatLastPlayed(now)).toBe("Just now");
  });

  it("returns minutes ago", () => {
    const now = Date.now() / 1000;
    expect(formatLastPlayed(now - 300)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const now = Date.now() / 1000;
    expect(formatLastPlayed(now - 7200)).toBe("2h ago");
  });
});

describe("filterAndSortGames", () => {
  const mockGames: GameDto[] = [
    { id: 1, title: "Dota 2", source: "steam", sourceId: "570", exePath: null, coverPath: null, isFavorite: true, lastPlayed: 2000, totalPlayedSeconds: 5000, description: null, genres: null },
    { id: 2, title: "Celeste", source: "manual", sourceId: null, exePath: "C:/celeste.exe", coverPath: null, isFavorite: false, lastPlayed: 1000, totalPlayedSeconds: 3000, description: null, genres: null },
    { id: 3, title: "Fortnite", source: "epic", sourceId: "fn", exePath: "C:/fn.exe", coverPath: null, isFavorite: true, lastPlayed: 3000, totalPlayedSeconds: 10000, description: null, genres: null },
  ];

  it("filters by search query", () => {
    const result = filterAndSortGames(mockGames, "dota", "alphabetical", false, null);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Dota 2");
  });

  it("filters favorites only", () => {
    const result = filterAndSortGames(mockGames, "", "alphabetical", true, null);
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.isFavorite)).toBe(true);
  });

  it("filters by source", () => {
    const result = filterAndSortGames(mockGames, "", "alphabetical", false, "steam");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Dota 2");
  });

  it("sorts by recent", () => {
    const result = filterAndSortGames(mockGames, "", "recent", false, null);
    expect(result[0].title).toBe("Fortnite");
    expect(result[1].title).toBe("Dota 2");
    expect(result[2].title).toBe("Celeste");
  });

  it("sorts by playtime", () => {
    const result = filterAndSortGames(mockGames, "", "playtime", false, null);
    expect(result[0].title).toBe("Fortnite");
    expect(result[2].title).toBe("Celeste");
  });

  it("sorts alphabetically", () => {
    const result = filterAndSortGames(mockGames, "", "alphabetical", false, null);
    expect(result[0].title).toBe("Celeste");
    expect(result[1].title).toBe("Dota 2");
    expect(result[2].title).toBe("Fortnite");
  });
});
