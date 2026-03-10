import type { ItemId, ItemStack } from "../items/item-catalog.ts";

const normalizeCount = (count: number): number => Math.max(0, Math.floor(count));

export class InventoryState {
  private readonly slots: Array<ItemStack | null>;

  public constructor(public readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error("Inventory capacity must be a positive integer");
    }

    this.slots = Array.from({ length: capacity }, () => null);
  }

  public getSlots(): readonly (ItemStack | null)[] {
    return this.slots;
  }

  public hydrate(slots: readonly (ItemStack | null)[]): void {
    for (let i = 0; i < this.capacity; i++) {
      const stack = slots[i] ?? null;
      if (!stack || normalizeCount(stack.count) <= 0) {
        this.slots[i] = null;
        continue;
      }

      this.slots[i] = {
        itemId: stack.itemId,
        count: normalizeCount(stack.count),
      };
    }
  }

  public addItem(itemId: ItemId, count: number): number {
    let remaining = normalizeCount(count);
    if (remaining <= 0) {
      return 0;
    }

    for (let i = 0; i < this.capacity; i++) {
      const stack = this.slots[i];
      if (!stack || stack.itemId !== itemId) {
        continue;
      }

      stack.count += remaining;
      return 0;
    }

    for (let i = 0; i < this.capacity; i++) {
      if (this.slots[i] !== null) {
        continue;
      }

      this.slots[i] = {
        itemId,
        count: remaining,
      };
      remaining = 0;
      break;
    }

    return remaining;
  }

  public toSnapshot(): Array<ItemStack | null> {
    return this.slots.map((stack) =>
      stack
        ? {
            itemId: stack.itemId,
            count: normalizeCount(stack.count),
          }
        : null,
    );
  }
}
