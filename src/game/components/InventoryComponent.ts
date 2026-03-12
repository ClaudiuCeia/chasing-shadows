import { Component } from "@claudiu-ceia/tick";
import type { ItemStack } from "../items/item-catalog.ts";
import { cloneItemStack, normalizeItemSlots } from "../items/item-stack.ts";

export class InventoryComponent extends Component {
  private slots: Array<ItemStack | null>;

  public constructor(public readonly capacity: number) {
    super();
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error("Inventory capacity must be a positive integer");
    }

    this.slots = Array.from({ length: capacity }, () => null);
  }

  public getSlots(): readonly (ItemStack | null)[] {
    return this.slots.map(cloneItemStack);
  }

  public setSlots(slots: readonly (ItemStack | null)[]): void {
    this.slots = normalizeItemSlots(slots, this.capacity);
  }
}
