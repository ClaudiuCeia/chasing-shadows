import type { TileDelta } from "../world/InfiniteTilemap.ts";
import type { LootBoxDelta } from "../world/LootBoxField.ts";
import type { ItemStack } from "../items/item-catalog.ts";

export type NeedsSnapshot = {
  hunger: number;
  thirst: number;
  sickness: number;
  heat: number;
  cold: number;
};

export type SaveGameV1 = {
  version: 1;
  seed: number;
  elapsedSeconds: number;
  terminatorTravelDistance: number;
  hp: number;
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
  };
  needs: NeedsSnapshot;
  mapDeltas: TileDelta[];
  inventory?: Array<ItemStack | null>;
  lootBoxDeltas?: LootBoxDelta[];
};
