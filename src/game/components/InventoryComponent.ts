import { Component } from "@claudiu-ceia/tick";
import {
  getItemDefinition,
  type EquipmentSlotId,
  type ItemStack,
  type WeaponAmmoSlotId,
} from "../items/item-catalog.ts";
import { cloneItemStack, normalizeItemSlots } from "../items/item-stack.ts";

export const QUICK_SLOT_COUNT = 2;
export const ACTIVE_HOTBAR_SLOT_VALUES = ["primary", "secondary", "quick1", "quick2"] as const;
export const DEFAULT_ACTIVE_HOTBAR_SLOT = "primary" as const;

export type ActiveHotbarSlot = (typeof ACTIVE_HOTBAR_SLOT_VALUES)[number];

export type EquipmentSlotState = Record<EquipmentSlotId, ItemStack | null>;
export type WeaponAmmoSlotState = Record<WeaponAmmoSlotId, ItemStack | null>;

export type InventoryState = {
  equipment: EquipmentSlotState;
  weaponAmmo: WeaponAmmoSlotState;
  activeSlot: ActiveHotbarSlot;
  quickSlots: Array<ItemStack | null>;
  backpackSlots: Array<ItemStack | null>;
};

const ACTIVE_HOTBAR_SLOT_SET = new Set<ActiveHotbarSlot>(ACTIVE_HOTBAR_SLOT_VALUES);

const normalizeActiveHotbarSlot = (slot: unknown): ActiveHotbarSlot =>
  typeof slot === "string" && ACTIVE_HOTBAR_SLOT_SET.has(slot as ActiveHotbarSlot)
    ? (slot as ActiveHotbarSlot)
    : DEFAULT_ACTIVE_HOTBAR_SLOT;

const ACTIVE_WEAPON_SLOT_BY_HOTBAR_SLOT: Partial<Record<ActiveHotbarSlot, EquipmentSlotId>> = {
  primary: "mainWeapon",
  secondary: "secondaryWeapon",
};

const ACTIVE_QUICK_SLOT_INDEX_BY_HOTBAR_SLOT: Partial<Record<ActiveHotbarSlot, number>> = {
  quick1: 0,
  quick2: 1,
};

const AMMO_SLOT_BY_WEAPON_SLOT: Record<"mainWeapon" | "secondaryWeapon", WeaponAmmoSlotId> = {
  mainWeapon: "mainWeaponAmmo",
  secondaryWeapon: "secondaryWeaponAmmo",
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
  private activeSlot: ActiveHotbarSlot = DEFAULT_ACTIVE_HOTBAR_SLOT;
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
      activeSlot: this.activeSlot,
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

    if (state.activeSlot !== undefined) {
      this.activeSlot = normalizeActiveHotbarSlot(state.activeSlot);
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

  public getActiveSlot(): ActiveHotbarSlot {
    return this.activeSlot;
  }

  public setActiveSlot(slot: ActiveHotbarSlot): void {
    this.activeSlot = normalizeActiveHotbarSlot(slot);
  }

  public getEquippedWeaponForActiveSlot(): ItemStack | null {
    const equipmentSlot = ACTIVE_WEAPON_SLOT_BY_HOTBAR_SLOT[this.activeSlot];
    return equipmentSlot ? this.getEquipmentSlot(equipmentSlot) : null;
  }

  public getAmmoSlotForActiveWeapon(): WeaponAmmoSlotId | null {
    const equipmentSlot = ACTIVE_WEAPON_SLOT_BY_HOTBAR_SLOT[this.activeSlot];
    if (equipmentSlot !== "mainWeapon" && equipmentSlot !== "secondaryWeapon") {
      return null;
    }

    return AMMO_SLOT_BY_WEAPON_SLOT[equipmentSlot];
  }

  public getActiveWeaponAmmoCount(): number | null {
    const weapon = this.getEquippedWeaponForActiveSlot();
    if (!weapon) {
      return null;
    }

    const ammoItemId = getItemDefinition(weapon.itemId).usesAmmo;
    if (!ammoItemId) {
      return null;
    }

    const ammoSlot = this.getAmmoSlotForActiveWeapon();
    if (!ammoSlot) {
      return 0;
    }

    const ammo = this.weaponAmmo[ammoSlot];
    return ammo?.itemId === ammoItemId ? ammo.count : 0;
  }

  public consumeAmmoForActiveWeapon(amount = 1): boolean {
    const normalizedAmount = Math.max(0, Math.floor(amount));
    if (normalizedAmount === 0) {
      return true;
    }

    const weapon = this.getEquippedWeaponForActiveSlot();
    if (!weapon) {
      return false;
    }

    const ammoItemId = getItemDefinition(weapon.itemId).usesAmmo;
    if (!ammoItemId) {
      return true;
    }

    const ammoSlot = this.getAmmoSlotForActiveWeapon();
    if (!ammoSlot) {
      return false;
    }

    const ammo = this.weaponAmmo[ammoSlot];
    if (!ammo || ammo.itemId !== ammoItemId || ammo.count < normalizedAmount) {
      return false;
    }

    const remaining = ammo.count - normalizedAmount;
    this.weaponAmmo[ammoSlot] = remaining > 0 ? { itemId: ammo.itemId, count: remaining } : null;
    return true;
  }

  public getQuickSlotIndexForActiveSlot(): number | null {
    return ACTIVE_QUICK_SLOT_INDEX_BY_HOTBAR_SLOT[this.activeSlot] ?? null;
  }

  public isEquipmentSlotActive(slot: EquipmentSlotId): boolean {
    return ACTIVE_WEAPON_SLOT_BY_HOTBAR_SLOT[this.activeSlot] === slot;
  }

  public isQuickSlotActive(index: number): boolean {
    return ACTIVE_QUICK_SLOT_INDEX_BY_HOTBAR_SLOT[this.activeSlot] === index;
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
