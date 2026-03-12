import { InventoryComponent } from "../components/InventoryComponent.ts";
import type { ItemId, ItemStack } from "../items/item-catalog.ts";

export const ItemTransferSystem = {
  addItem(inventory: InventoryComponent, itemId: ItemId, count: number): number {
    const remaining = Math.max(0, Math.floor(count));
    if (remaining <= 0) {
      return 0;
    }

    const slots = inventory.getSlots();
    const next: (ItemStack | null)[] = slots.map((s) => (s ? { ...s } : null));

    for (let i = 0; i < inventory.capacity; i++) {
      const stack = next[i];
      if (stack && stack.itemId === itemId) {
        stack.count += remaining;
        inventory.setSlots(next);
        return 0;
      }
    }

    for (let i = 0; i < inventory.capacity; i++) {
      if (next[i] === null) {
        next[i] = { itemId, count: remaining };
        inventory.setSlots(next);
        return 0;
      }
    }

    return remaining;
  },
};
