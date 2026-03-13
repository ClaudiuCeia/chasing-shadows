import { Component } from "@claudiu-ceia/tick";
import type { EquipmentSlotId, ItemStack, WeaponAmmoSlotId } from "../items/item-catalog.ts";
import { cloneItemStack, normalizeItemSlots } from "../items/item-stack.ts";

export const QUICK_SLOT_COUNT = 4;

export type EquipmentSlotState = Record<EquipmentSlotId, ItemStack | null>;
export type WeaponAmmoSlotState = Record<WeaponAmmoSlotId, ItemStack | null>;

export type InventoryState = {
  equipment: EquipmentSlotState;
  weaponAmmo: WeaponAmmoSlotState;
  quickSlots: Array<ItemStack | null>;
  backpackSlots: Array<ItemStack | null>;
};

const createEmptyEquipment = (): EquipmentSlotState => ({
  mainWeapon: null,
  secondaryWeapon: null,
  helmet: null,
  bodyArmor: null,
});

const createEmptyWeaponAmmo = (): WeaponAmmoSlotState => ({
  mainWeaponAmmo: null,
  secondaryWeaponAmmo: null,
});

export class InventoryComponent extends Component {
  private equipment: EquipmentSlotState = createEmptyEquipment();
  private weaponAmmo: WeaponAmmoSlotState = createEmptyWeaponAmmo();
  private quickSlots: Array<ItemStack | null>;
  private backpackSlots: Array<ItemStack | null>;

  public constructor(public readonly backpackCapacity: number, public readonly quickSlotCount = QUICK_SLOT_COUNT) {
    super();
    if (!Number.isInteger(backpackCapacity) || backpackCapacity <= 0) {
      throw new Error("Inventory backpack capacity must be a positive integer");
    }
    if (!Number.isInteger(quickSlotCount) || quickSlotCount <= 0) {
      throw new Error("Inventory quick slot count must be a positive integer");
    }

    this.quickSlots = Array.from({ length: quickSlotCount }, () => null);
    this.backpackSlots = Array.from({ length: backpackCapacity }, () => null);
  }

  public getState(): InventoryState {
    return {
      equipment: {
        mainWeapon: cloneItemStack(this.equipment.mainWeapon),
        secondaryWeapon: cloneItemStack(this.equipment.secondaryWeapon),
        helmet: cloneItemStack(this.equipment.helmet),
        bodyArmor: cloneItemStack(this.equipment.bodyArmor),
      },
      weaponAmmo: {
        mainWeaponAmmo: cloneItemStack(this.weaponAmmo.mainWeaponAmmo),
        secondaryWeaponAmmo: cloneItemStack(this.weaponAmmo.secondaryWeaponAmmo),
      },
      quickSlots: this.quickSlots.map(cloneItemStack),
      backpackSlots: this.backpackSlots.map(cloneItemStack),
    };
  }

  public setState(state: Partial<InventoryState>): void {
    if (state.equipment) {
      this.equipment = {
        mainWeapon: cloneItemStack(state.equipment.mainWeapon),
        secondaryWeapon: cloneItemStack(state.equipment.secondaryWeapon),
        helmet: cloneItemStack(state.equipment.helmet),
        bodyArmor: cloneItemStack(state.equipment.bodyArmor),
      };
    }

    if (state.weaponAmmo) {
      this.weaponAmmo = {
        mainWeaponAmmo: cloneItemStack(state.weaponAmmo.mainWeaponAmmo),
        secondaryWeaponAmmo: cloneItemStack(state.weaponAmmo.secondaryWeaponAmmo),
      };
    }

    if (state.quickSlots) {
      this.quickSlots = normalizeItemSlots(state.quickSlots, this.quickSlotCount);
    }

    if (state.backpackSlots) {
      this.backpackSlots = normalizeItemSlots(state.backpackSlots, this.backpackCapacity);
    }
  }

  public getEquipment(): EquipmentSlotState {
    return this.getState().equipment;
  }

  public getWeaponAmmo(): WeaponAmmoSlotState {
    return this.getState().weaponAmmo;
  }

  public getQuickSlots(): readonly (ItemStack | null)[] {
    return this.quickSlots.map(cloneItemStack);
  }

  public getBackpackSlots(): readonly (ItemStack | null)[] {
    return this.backpackSlots.map(cloneItemStack);
  }

  public setQuickSlots(slots: readonly (ItemStack | null)[]): void {
    this.quickSlots = normalizeItemSlots(slots, this.quickSlotCount);
  }

  public setBackpackSlots(slots: readonly (ItemStack | null)[]): void {
    this.backpackSlots = normalizeItemSlots(slots, this.backpackCapacity);
  }

  public getEquipmentSlot(slot: EquipmentSlotId): ItemStack | null {
    return cloneItemStack(this.equipment[slot]);
  }

  public setEquipmentSlot(slot: EquipmentSlotId, stack: ItemStack | null): void {
    const next = cloneItemStack(stack);
    this.equipment[slot] = next ? { itemId: next.itemId, count: 1 } : null;
  }

  public getWeaponAmmoSlot(slot: WeaponAmmoSlotId): ItemStack | null {
    return cloneItemStack(this.weaponAmmo[slot]);
  }

  public setWeaponAmmoSlot(slot: WeaponAmmoSlotId, stack: ItemStack | null): void {
    this.weaponAmmo[slot] = cloneItemStack(stack);
  }
}
