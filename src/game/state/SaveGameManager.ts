import { STORAGE_KEYS } from "../config/game-config.ts";
import { ITEM_IDS } from "../items/item-catalog.ts";
import { LOOT_BOX_SLOT_COUNT } from "../world/LootBoxField.ts";
import type { SaveGameV1 } from "./save-types.ts";

const VALID_TILE_KINDS = new Set(["regolith", "rock", "scrap", "shelter"]);
const VALID_TILE_SURFACE_VARIANTS = new Set(["neutral", "sun", "dark"]);
const VALID_ITEM_IDS = new Set<string>(ITEM_IDS);

const isTileCorners = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.northWest === "number" &&
    typeof value.northEast === "number" &&
    typeof value.southEast === "number" &&
    typeof value.southWest === "number"
  );
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isItemStackOrNull = (value: unknown): boolean => {
  if (value === null) {
    return true;
  }

  if (!isObject(value)) {
    return false;
  }

  if (typeof value.itemId !== "string" || !VALID_ITEM_IDS.has(value.itemId)) {
    return false;
  }

  if (typeof value.count !== "number" || !Number.isFinite(value.count) || value.count <= 0) {
    return false;
  }

  return true;
};

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
    if (entry.elevation !== undefined) {
      if (typeof entry.elevation !== "number" || !Number.isFinite(entry.elevation)) {
        return false;
      }
    }
    if (entry.blocking !== undefined && typeof entry.blocking !== "boolean") {
      return false;
    }
    if (entry.occluder !== undefined && typeof entry.occluder !== "boolean") {
      return false;
    }
    if (
      entry.surfaceVariant !== undefined &&
      (typeof entry.surfaceVariant !== "string" || !VALID_TILE_SURFACE_VARIANTS.has(entry.surfaceVariant))
    ) {
      return false;
    }
    if (entry.corners !== undefined && !isTileCorners(entry.corners)) {
      return false;
    }
  }

  if (value.inventory !== undefined) {
    if (!Array.isArray(value.inventory)) {
      return false;
    }

    for (const entry of value.inventory) {
      if (!isItemStackOrNull(entry)) {
        return false;
      }
    }
  }

  if (value.lootBoxDeltas !== undefined) {
    if (!Array.isArray(value.lootBoxDeltas)) {
      return false;
    }

    for (const entry of value.lootBoxDeltas) {
      if (!isObject(entry)) {
        return false;
      }
      if (typeof entry.x !== "number" || typeof entry.y !== "number") {
        return false;
      }

      if (entry.removed === true) {
        continue;
      }

      if (!Array.isArray(entry.slots) || entry.slots.length !== LOOT_BOX_SLOT_COUNT) {
        return false;
      }

      for (const slot of entry.slots) {
        if (!isItemStackOrNull(slot)) {
          return false;
        }
      }
    }
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
