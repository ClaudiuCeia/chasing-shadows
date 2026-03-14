import { GAME_CONFIG, STORAGE_KEYS } from "../config/game-config.ts";
import { ITEM_IDS } from "../items/item-catalog.ts";
import { LOOT_BOX_SLOT_COUNT } from "../world/LootBoxField.ts";
import { PLAYER_FIRE_MODE_VALUES } from "../render/player-animation-logic.ts";
import { hasStructureBlueprintId } from "../structures/structure-blueprints.ts";
import { STRUCTURE_ROTATIONS } from "../structures/structure-types.ts";
import { TILE_KIND_VALUES } from "../world/tile-types.ts";
import type { SaveGame } from "./save-types.ts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type Validator<T = unknown> = (value: unknown) => boolean;

const ITEM_ID_SET = new Set<string>(ITEM_IDS);
const TILE_KIND_SET = new Set<string>(TILE_KIND_VALUES);
const FIRE_MODE_SET = new Set<string>(PLAYER_FIRE_MODE_VALUES);
const STRUCTURE_ROTATION_SET = new Set<number>(STRUCTURE_ROTATIONS);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const int = (options: { min?: number; max?: number } = {}): Validator<number> =>
  (value: unknown): boolean =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    (options.min === undefined || value >= options.min) &&
    (options.max === undefined || value <= options.max);

const numberInRange = (options: { min?: number; max?: number } = {}): Validator<number> =>
  (value: unknown): boolean =>
    finite(value) &&
    (options.min === undefined || value >= options.min) &&
    (options.max === undefined || value <= options.max);

const literal = <T extends string>(allowed: ReadonlySet<T>): Validator<T> =>
  (value: unknown): value is T => typeof value === "string" && allowed.has(value as T);

const arrayOf = <T>(item: Validator<T>, options: { length?: number } = {}): Validator<T[]> =>
  (value: unknown): value is T[] =>
    Array.isArray(value) &&
    (options.length === undefined || value.length === options.length) &&
    value.every((entry) => item(entry));

const required = <T>(value: Record<string, unknown>, key: string, validate: Validator<T>): boolean =>
  validate(value[key]);

const optional = <T>(value: Record<string, unknown>, key: string, validate: Validator<T>): boolean =>
  value[key] === undefined || validate(value[key]);

const isVector = (value: unknown): boolean =>
  isObject(value) && required(value, "x", finite) && required(value, "y", finite);

const isDirectionVector = (value: unknown): boolean => {
  if (!isObject(value) || !required(value, "x", finite) || !required(value, "y", finite)) {
    return false;
  }

  return value.x !== 0 || value.y !== 0;
};

const isItemStack = (value: unknown): boolean =>
  isObject(value) &&
  typeof value.itemId === "string" &&
  ITEM_ID_SET.has(value.itemId) &&
  required(value, "count", int({ min: 1 }));

const isNullableItemStack = (value: unknown): boolean => value === null || isItemStack(value);

const isInventory = (value: unknown): boolean =>
  isObject(value) &&
  required(value, "equipment", (entry): entry is Record<string, unknown> =>
    isObject(entry) &&
    isNullableItemStack(entry.mainWeapon) &&
    isNullableItemStack(entry.secondaryWeapon) &&
    isNullableItemStack(entry.helmet) &&
    isNullableItemStack(entry.bodyArmor),
  ) &&
  required(value, "weaponAmmo", (entry): entry is Record<string, unknown> =>
    isObject(entry) &&
    isNullableItemStack(entry.mainWeaponAmmo) &&
    isNullableItemStack(entry.secondaryWeaponAmmo),
  ) &&
  required(value, "quickSlots", arrayOf(isNullableItemStack, { length: GAME_CONFIG.inventoryQuickSlots })) &&
  required(value, "backpackSlots", arrayOf(isNullableItemStack, { length: GAME_CONFIG.inventorySlots }));
const isLootSlots = arrayOf(isNullableItemStack, { length: LOOT_BOX_SLOT_COUNT });

const isTileCorners = (value: unknown): boolean =>
  isObject(value) &&
  optional(value, "northWest", int({ min: 0 })) &&
  optional(value, "northEast", int({ min: 0 })) &&
  optional(value, "southEast", int({ min: 0 })) &&
  optional(value, "southWest", int({ min: 0 }));

const isTileDelta = (value: unknown): boolean =>
  isObject(value) &&
  required(value, "x", int()) &&
  required(value, "y", int()) &&
  required(value, "kind", literal(TILE_KIND_SET)) &&
  optional(value, "elevation", int({ min: 0 })) &&
  optional(value, "blocking", (entry): entry is boolean => typeof entry === "boolean") &&
  optional(value, "occluder", (entry): entry is boolean => typeof entry === "boolean") &&
  optional(value, "corners", isTileCorners);

const isLootDelta = (value: unknown): boolean => {
  if (!isObject(value) || !required(value, "x", int()) || !required(value, "y", int())) {
    return false;
  }

  if (value.removed === true) {
    return true;
  }

  return required(value, "slots", isLootSlots);
};

const isStructureInstance = (value: unknown): boolean =>
  isObject(value) &&
  required(
    value,
    "blueprintId",
    (entry): entry is string => typeof entry === "string" && entry.length > 0 && hasStructureBlueprintId(entry),
  ) &&
  required(value, "originX", int()) &&
  required(value, "originY", int()) &&
  required(value, "baseZ", int({ min: 0 })) &&
  required(value, "rotation", (entry): entry is number => typeof entry === "number" && STRUCTURE_ROTATION_SET.has(entry));

const isSaveGame = (value: unknown): value is SaveGame => {
  if (!isObject(value) || value.version !== 1) {
    return false;
  }

  if (!isObject(value.world) || !isObject(value.player)) {
    return false;
  }

  const { world, player } = value;
  if (
    !required(world, "seed", int()) ||
    !required(world, "chunkSize", int({ min: 1 })) ||
    !required(world, "lootSpawnChance", numberInRange({ min: 0, max: 1 })) ||
    !required(world, "elapsedSeconds", numberInRange({ min: 0 })) ||
    !required(world, "tileDeltas", arrayOf(isTileDelta)) ||
    !required(world, "lootDeltas", arrayOf(isLootDelta)) ||
    !optional(world, "structures", arrayOf(isStructureInstance)) ||
    !isObject(world.terminator) ||
    !required(world.terminator, "safeBandHalfWidth", numberInRange({ min: 0 })) ||
    !required(world.terminator, "travelSpeed", numberInRange({ min: 0 })) ||
    !required(world.terminator, "travelDistance", numberInRange({ min: 0 })) ||
    !required(world.terminator, "direction", isDirectionVector)
  ) {
    return false;
  }

  if (
    !required(player, "position", isVector) ||
    !required(player, "rotation", finite) ||
    !required(player, "velocity", isVector) ||
    !required(player, "health", numberInRange({ min: 0, max: 100 })) ||
    !isObject(player.needs) ||
    !required(player.needs, "hunger", numberInRange({ min: 0, max: 100 })) ||
    !required(player.needs, "thirst", numberInRange({ min: 0, max: 100 })) ||
    !required(player.needs, "sickness", numberInRange({ min: 0 })) ||
    !isObject(player.temperature) ||
    !required(player.temperature, "thermalBalance", finite) ||
    !required(player.temperature, "heat", numberInRange({ min: 0 })) ||
    !required(player.temperature, "cold", numberInRange({ min: 0 })) ||
    !required(player, "inventory", isInventory) ||
    !required(player, "fireMode", literal(FIRE_MODE_SET))
  ) {
    return false;
  }

  return true;
};

export class SaveGameManager {
  private readonly storage: StorageLike | null;

  public constructor(storage?: StorageLike | null) {
    this.storage = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  }

  public loadAutosave(): SaveGame | null {
    if (!this.storage) return null;

    const raw = this.storage.getItem(STORAGE_KEYS.autosave);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;
      return isSaveGame(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  public saveAutosave(data: SaveGame): void {
    if (!this.storage) return;
    this.storage.setItem(STORAGE_KEYS.autosave, JSON.stringify(data));
  }

  public clearAutosave(): void {
    if (!this.storage) return;
    this.storage.removeItem(STORAGE_KEYS.autosave);
  }
}
