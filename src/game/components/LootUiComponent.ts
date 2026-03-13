import { Component, Vector2D } from "@claudiu-ceia/tick";
import type { EquipmentSlotId, ItemStack, WeaponAmmoSlotId } from "../items/item-catalog.ts";
import type { InventoryState } from "./InventoryComponent.ts";
import { createTileBoxLootSource, type LootSourceRef } from "../loot/loot-sources.ts";

export type InventorySlotSection = "equipment" | "weaponAmmo" | "quick" | "backpack" | "source";
export type InventorySlotKey = EquipmentSlotId | WeaponAmmoSlotId | number;

export type InventorySlotRef = {
  section: InventorySlotSection;
  key: InventorySlotKey;
};

export type DraggedInventoryItem = {
  hiddenOrigin: InventorySlotRef | null;
  stack: ItemStack;
};

export type InventoryDragSnapshot = {
  inventory: InventoryState;
  source: LootSourceRef | null;
  sourceSlots: readonly (ItemStack | null)[] | null;
};

export class LootUiComponent extends Component {
  public openSource: LootSourceRef | null = null;
  public hoveredSlot: InventorySlotRef | null = null;
  public draggedItem: DraggedInventoryItem | null = null;
  public dragSnapshot: InventoryDragSnapshot | null = null;
  public dragHudPoint: Vector2D | null = null;

  public isOpen(): boolean {
    return this.openSource !== null;
  }

  public open(source: LootSourceRef): void {
    this.openSource = source;
  }

  public openTileBox(x: number, y: number): void {
    this.open(createTileBoxLootSource(x, y));
  }

  public close(): void {
    this.openSource = null;
    this.hoveredSlot = null;
    this.draggedItem = null;
    this.dragSnapshot = null;
    this.dragHudPoint = null;
  }
}
