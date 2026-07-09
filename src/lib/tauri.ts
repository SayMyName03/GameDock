import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type { GameDto, PlaySessionDto } from "../types/game";

export async function scanGames(): Promise<GameDto[]> {
  return invoke<GameDto[]>("scan_games");
}

export async function getGames(): Promise<GameDto[]> {
  return invoke<GameDto[]>("get_games");
}

export async function getGame(id: number): Promise<GameDto> {
  return invoke<GameDto>("get_game", { id });
}

export async function toggleFavorite(id: number): Promise<boolean> {
  return invoke<boolean>("toggle_favorite", { id });
}

export async function addManualGame(exePath: string): Promise<GameDto> {
  return invoke<GameDto>("add_manual_game", { exePath });
}

export async function removeManualGame(id: number): Promise<void> {
  return invoke<void>("remove_manual_game", { id });
}

export async function launchGame(id: number): Promise<PlaySessionDto> {
  return invoke<PlaySessionDto>("launch_game", { id });
}

export async function getRunningGame(): Promise<number | null> {
  return invoke<number | null>("get_running_game");
}

export async function waitForExit(): Promise<number | null> {
  return invoke<number | null>("wait_for_exit");
}

export async function fetchMetadata(id: number): Promise<GameDto> {
  return invoke<GameDto>("fetch_metadata", { id });
}

export async function fetchAllMetadata(): Promise<void> {
  return invoke<void>("fetch_all_metadata");
}

export async function setIgdbCredentials(
  clientId: string,
  clientSecret: string
): Promise<boolean> {
  return invoke<boolean>("set_igdb_credentials", {
    clientId,
    clientSecret,
  });
}

export async function hasIgdbCredentials(): Promise<boolean> {
  return invoke<boolean>("has_igdb_credentials");
}

export async function readCoverImage(gameId: number): Promise<string | null> {
  const bytes = await invoke<number[] | null>("read_cover_image", { gameId });
  if (!bytes) return null;
  const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
  return URL.createObjectURL(blob);
}

export async function pickExeFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Executable", extensions: ["exe"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export function onGameLaunched(callback: (gameId: number) => void): Promise<UnlistenFn> {
  return listen<{ gameId: number }>("game:launched", (event) => {
    callback(event.payload.gameId);
  });
}

export function onGameExited(
  callback: (gameId: number, durationSeconds: number) => void
): Promise<UnlistenFn> {
  return listen<{ gameId: number; durationSeconds: number }>("game:exited", (event) => {
    callback(event.payload.gameId, event.payload.durationSeconds);
  });
}

export function onMetadataFetched(callback: (gameId: number) => void): Promise<UnlistenFn> {
  return listen<{ gameId: number }>("metadata:fetched", (event) => {
    callback(event.payload.gameId);
  });
}

export function onScanProgress(callback: (title: string) => void): Promise<UnlistenFn> {
  return listen<{ title: string }>("scan:progress", (event) => {
    callback(event.payload.title);
  });
}

export function onScanComplete(callback: (count: number) => void): Promise<UnlistenFn> {
  return listen<{ count: number }>("scan:complete", (event) => {
    callback(event.payload.count);
  });
}
