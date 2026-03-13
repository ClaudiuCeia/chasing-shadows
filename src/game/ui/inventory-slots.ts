import { cloneItemStack, normalizeItemSlots } from "../items/item-stack.ts";
import {
  canEquipItemInSlot,
  canPlaceItemInQuickSlot,
  canWeaponUseAmmo,
  type EquipmentSlotId,
  type ItemStack,
  type WeaponAmmoSlotId,
} from "../items/item-catalog.ts";
import { getLootSourceSlotCount, getLootSourceSnapshot, setLootSourceSlots, type LootSourceRef } from "../loot/loot-sources.ts";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import type { InventoryDragSnapshot, InventorySlotRef } from "../components/LootUiComponent.ts";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

export const isSingleItemInventorySlot = (ref: InventorySlotRef): boolean => ref.section === "equipment";

export const isStackingInventorySlot = (ref: InventorySlotRef): boolean => !isSingleItemInventorySlot(ref);

export const normalizeStackForInventorySlot = (ref: InventorySlotRef, stack: ItemStack | null): ItemStack | null => {
  const next = cloneItemStack(stack);
  if (!next) {
    return null;
  }

  return isSingleItemInventorySlot(ref) ? { itemId: next.itemId, count: 1 } : next;
};

export const getInventoryStackAt = (
  inventory: InventoryComponent,
  source: LootSourceRef | null,
  lootField: LootFieldComponent,
  map: InfiniteTilemap,
  ref: InventorySlotRef,
): ItemStack | null => {
  switch (ref.section) {
    case "equipment":
      return inventory.getEquipmentSlot(ref.key as EquipmentSlotId);
    case "weaponAmmo":
      return inventory.getWeaponAmmoSlot(ref.key as WeaponAmmoSlotId);
    case "quick":
      return cloneItemStack(inventory.getQuickSlots()[ref.key as number] ?? null);
    case "backpack":
      return cloneItemStack(inventory.getBackpackSlots()[ref.key as number] ?? null);
    case "source": {
      if (!source) {
        return null;
      }
      const snapshot = getLootSourceSnapshot(source, lootField, map);
      return cloneItemStack(snapshot?.slots[ref.key as number] ?? null);
    }
  }
};

export const combineInventoryStacks = (target: ItemStack | null, incoming: ItemStack | null): ItemStack | null => {
  if (!target) {
    return cloneItemStack(incoming);
  }
  if (!incoming || target.itemId !== incoming.itemId) {
    return null;
  }

  return {
    itemId: target.itemId,
    count: target.count + incoming.count,
  };
};

export const setInventoryStackAt = (
  inventory: InventoryComponent,
  source: LootSourceRef | null,
  lootField: LootFieldComponent,
  map: InfiniteTilemap,
  ref: InventorySlotRef,
  stack: ItemStack | null,
): void => {
  switch (ref.section) {
    case "equipment":
      inventory.setEquipmentSlot(ref.key as EquipmentSlotId, normalizeStackForInventorySlot(ref, stack));
      return;
    case "weaponAmmo":
      inventory.setWeaponAmmoSlot(ref.key as WeaponAmmoSlotId, stack);
      return;
    case "quick": {
      const next = [...inventory.getQuickSlots()];
      next[ref.key as number] = cloneItemStack(stack);
      inventory.setQuickSlots(next);
      return;
    }
    case "backpack": {
      const next = [...inventory.getBackpackSlots()];
      next[ref.key as number] = cloneItemStack(stack);
      inventory.setBackpackSlots(next);
      return;
    }
    case "source": {
      if (!source) {
        return;
      }
      const snapshot = getLootSourceSnapshot(source, lootField, map);
      const next = snapshot
        ? [...snapshot.slots]
        : Array.from({ length: getLootSourceSlotCount(source, lootField, map) }, () => null as ItemStack | null);
      next[ref.key as number] = cloneItemStack(stack);
      setLootSourceSlots(source, next, lootField, map);
    }
  }
};

export const canPlaceInventoryStackAt = (
  inventory: InventoryComponent,
  source: LootSourceRef | null,
  lootField: LootFieldComponent,
  map: InfiniteTilemap,
  ref: InventorySlotRef,
  stack: ItemStack | null,
): boolean => {
  if (stack === null) {
    return true;
  }

  switch (ref.section) {
    case "equipment":
      return canEquipItemInSlot(stack.itemId, ref.key as EquipmentSlotId);
    case "weaponAmmo":
      if (!stack) {
        return true;
      }
      if (stack.count <= 0) {
        return false;
      }
      const pairedWeapon = inventory.getEquipmentSlot(ref.key === "mainWeaponAmmo" ? "mainWeapon" : "secondaryWeapon");
      return pairedWeapon !== null && canWeaponUseAmmo(pairedWeapon.itemId, stack.itemId);
    case "quick":
      return canPlaceItemInQuickSlot(stack.itemId);
    case "backpack":
      return true;
    case "source": {
      if (!source) {
        return false;
      }
      return getLootSourceSnapshot(source, lootField, map) !== null;
    }
  }
};

export const restoreDraggedInventoryItem = (
  state: {
    draggedItem: { hiddenOrigin: InventorySlotRef | null; stack: ItemStack } | null;
    dragSnapshot: InventoryDragSnapshot | null;
    openSource: LootSourceRef | null;
    dragHudPoint: unknown;
  },
  inventory: InventoryComponent,
  lootField: LootFieldComponent,
  map: InfiniteTilemap,
): void => {
  if (!state.draggedItem && !state.dragSnapshot) {
    return;
  }

  if (state.dragSnapshot) {
    inventory.setState(state.dragSnapshot.inventory);
    state.openSource = state.dragSnapshot.source;
    if (state.dragSnapshot.source && state.dragSnapshot.sourceSlots) {
      setLootSourceSlots(state.dragSnapshot.source, state.dragSnapshot.sourceSlots, lootField, map);
    }
  }

  state.draggedItem = null;
  state.dragSnapshot = null;
  state.dragHudPoint = null;
};
