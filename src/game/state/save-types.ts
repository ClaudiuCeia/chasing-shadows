import type { PlayerFireMode } from "../render/player-animation-logic.ts";
import type { EquipmentSlotId, ItemStack, WeaponAmmoSlotId } from "../items/item-catalog.ts";
import type { StructureInstance } from "../structures/structure-types.ts";
import type { LootBoxDelta } from "../world/LootBoxField.ts";
import type { TileDelta } from "../world/InfiniteTilemap.ts";

export type SaveVector = {
  x: number;
  y: number;
};

export type SaveNeeds = {
  hunger: number;
  thirst: number;
  sickness: number;
};

export type SaveTemperature = {
  thermalBalance: number;
  heat: number;
  cold: number;
};

export type SaveTerminator = {
  safeBandHalfWidth: number;
  travelSpeed: number;
  travelDistance: number;
  direction: SaveVector;
};

export type SaveWorld = {
  seed: number;
  chunkSize: number;
  lootSpawnChance: number;
  elapsedSeconds: number;
  terminator: SaveTerminator;
  tileDeltas: TileDelta[];
  lootDeltas: LootBoxDelta[];
  structures?: StructureInstance[];
};

export type SavePlayer = {
  position: SaveVector;
  rotation: number;
  velocity: SaveVector;
  health: number;
  needs: SaveNeeds;
  temperature: SaveTemperature;
  inventory: {
    equipment: Record<EquipmentSlotId, ItemStack | null>;
    weaponAmmo: Record<WeaponAmmoSlotId, ItemStack | null>;
    quickSlots: Array<ItemStack | null>;
    backpackSlots: Array<ItemStack | null>;
  };
  fireMode: PlayerFireMode;
};

export type SaveGameV1 = {
  version: 1;
  world: SaveWorld;
  player: SavePlayer;
};

export type SaveGame = SaveGameV1;
