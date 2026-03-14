import type { ItemStack } from "./item-catalog.ts";

export const cloneItemStack = (stack: ItemStack | null): ItemStack | null =>
  stack
    ? {
        itemId: stack.itemId,
        count: Math.max(1, Math.floor(stack.count)),
      }
    : null;

export const normalizeItemSlots = (
  slots: readonly (ItemStack | null)[],
  size: number,
): Array<ItemStack | null> =>
  Array.from({ length: size }, (_unused, index) => cloneItemStack(slots[index] ?? null));

export const areItemStacksEqual = (a: ItemStack | null, b: ItemStack | null): boolean => {
  if (a === null || b === null) {
    return a === b;
  }

  return a.itemId === b.itemId && a.count === b.count;
};

export const areItemSlotArraysEqual = (
  a: readonly (ItemStack | null)[],
  b: readonly (ItemStack | null)[],
  size: number,
): boolean => {
  for (let i = 0; i < size; i++) {
    if (!areItemStacksEqual(a[i] ?? null, b[i] ?? null)) {
      return false;
    }
  }

  return true;
};
