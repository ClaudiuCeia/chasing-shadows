import { STORAGE_KEYS } from "../config/game-config.ts";
import type { SaveGameV1 } from "./save-types.ts";

const VALID_TILE_KINDS = new Set(["regolith", "rock", "scrap", "shelter"]);

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSaveGameV1 = (value: unknown): value is SaveGameV1 => {
  if (!isObject(value)) return false;
  if (value.version !== 1) return false;
  if (typeof value.seed !== "number") return false;
  if (typeof value.elapsedSeconds !== "number") return false;
  if (typeof value.terminatorTravelDistance !== "number") return false;
  if (typeof value.hp !== "number") return false;
  if (!isObject(value.player)) return false;
  if (!isObject(value.needs)) return false;
  if (!Array.isArray(value.mapDeltas)) return false;

  const player = value.player;
  if (typeof player.x !== "number") return false;
  if (typeof player.y !== "number") return false;
  if (typeof player.vx !== "number") return false;
  if (typeof player.vy !== "number") return false;

  const needs = value.needs;
  if (typeof needs.hunger !== "number") return false;
  if (typeof needs.thirst !== "number") return false;
  if (typeof needs.sickness !== "number") return false;
  if (typeof needs.heat !== "number") return false;
  if (typeof needs.cold !== "number") return false;

  for (const entry of value.mapDeltas) {
    if (!isObject(entry)) return false;
    if (typeof entry.x !== "number") return false;
    if (typeof entry.y !== "number") return false;
    if (typeof entry.kind !== "string" || !VALID_TILE_KINDS.has(entry.kind)) return false;
  }

  return true;
};

export class SaveGameManager {
  private readonly storage: StorageLike | null;

  public constructor(storage?: StorageLike | null) {
    this.storage = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  }

  public loadAutosave(): SaveGameV1 | null {
    if (!this.storage) return null;

    const raw = this.storage.getItem(STORAGE_KEYS.autosave);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;
      return isSaveGameV1(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  public saveAutosave(data: SaveGameV1): void {
    if (!this.storage) return;
    this.storage.setItem(STORAGE_KEYS.autosave, JSON.stringify(data));
  }

  public clearAutosave(): void {
    if (!this.storage) return;
    this.storage.removeItem(STORAGE_KEYS.autosave);
  }
}
