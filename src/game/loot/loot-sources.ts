import type { Entity } from "@claudiu-ceia/tick";
import { LootContainerComponent } from "../components/LootContainerComponent.ts";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import type { ItemStack } from "../items/item-catalog.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

export type TileBoxLootSourceRef = {
  kind: "tile-box";
  x: number;
  y: number;
};

export type EntityLootSourceRef = {
  kind: "entity";
  entity: Entity;
};

export type LootSourceRef = TileBoxLootSourceRef | EntityLootSourceRef;

export type LootSourceSnapshot = {
  title: string;
  slots: readonly (ItemStack | null)[];
};

export const createTileBoxLootSource = (x: number, y: number): TileBoxLootSourceRef => ({
  kind: "tile-box",
  x: Math.floor(x),
  y: Math.floor(y),
});

export const getLootSourceSnapshot = (
  source: LootSourceRef,
  lootField: LootFieldComponent,
  map: InfiniteTilemap,
): LootSourceSnapshot | null => {
  switch (source.kind) {
    case "tile-box": {
      const box = lootField.getBoxAt(source.x, source.y, map);
      return box ? { title: "Loot", slots: box.slots } : null;
    }
    case "entity": {
      if (!source.entity.isAwake || !source.entity.hasComponent(LootContainerComponent)) {
        return null;
      }
      const container = source.entity.getComponent(LootContainerComponent);
      return { title: container.title, slots: container.getSlots() };
    }
  }
};

export const setLootSourceSlots = (
  source: LootSourceRef,
  slots: readonly (ItemStack | null)[],
  lootField: LootFieldComponent,
  map: InfiniteTilemap,
): void => {
  switch (source.kind) {
    case "tile-box":
      lootField.setSlots(source.x, source.y, slots);
      return;
    case "entity": {
      if (!source.entity.isAwake || !source.entity.hasComponent(LootContainerComponent)) {
        return;
      }
      source.entity.getComponent(LootContainerComponent).setSlots(slots);
    }
  }
};
