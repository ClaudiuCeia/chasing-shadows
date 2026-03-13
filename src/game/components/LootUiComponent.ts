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

export type InventoryDropFeedback = {
  message: string;
  expiresAt: number;
};

export class LootUiComponent extends Component {
  public openSource: LootSourceRef | null = null;
  public hoveredSlot: InventorySlotRef | null = null;
  public draggedItem: DraggedInventoryItem | null = null;
  public dragSnapshot: InventoryDragSnapshot | null = null;
  public dragHudPoint: Vector2D | null = null;
  public dropFeedback: InventoryDropFeedback | null = null;

  public showDropFeedback(message: string, durationMs = 1800): void {
    this.dropFeedback = {
      message,
      expiresAt: Date.now() + durationMs,
    };
  }

  public clearDropFeedback(): void {
    this.dropFeedback = null;
  }

  public getVisibleDropFeedback(now = Date.now()): string | null {
    if (!this.dropFeedback) {
      return null;
    }

    if (this.dropFeedback.expiresAt <= now) {
      this.dropFeedback = null;
      return null;
    }

    return this.dropFeedback.message;
  }

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
    this.dropFeedback = null;
  }
}
