import type { PlayerFireMode } from "../render/player-animation-logic.ts";

export type ItemId =
  | "body-armor"
  | "helmet"
  | "pistol-ammo"
  | "shotgun-ammo"
  | "pistol"
  | "ump5"
  | "shotgun"
  | "lug-wrench"
  | "knife"
  | "bandage"
  | "syringe"
  | "water-bottle"
  | "med-gel"
  | "canned-beans"
  | "hrc-pack";

export type ItemStack = {
  itemId: ItemId;
  count: number;
};

export type EquipmentSlotId = "mainWeapon" | "secondaryWeapon" | "helmet" | "bodyArmor";
export type WeaponAmmoSlotId = "mainWeaponAmmo" | "secondaryWeaponAmmo";
export type ItemCategory =
  | "material"
  | "consumable"
  | "medical"
  | "tool"
  | "weapon"
  | "melee"
  | "throwable"
  | "armor-head"
  | "armor-body"
  | "ammo";

export type ItemDefinition = {
  id: ItemId;
  label: string;
  description: string;
  spriteIndex: number;
  category: ItemCategory;
  quickSlotCompatible: boolean;
  fireMode?: PlayerFireMode;
  equipmentSlot?: EquipmentSlotId;
  ammoSlot?: WeaponAmmoSlotId;
  usesAmmo?: ItemId;
};

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  {
    id: "body-armor",
    label: "Body Armor",
    description: "A battered torso rig that still catches shrapnel.",
    spriteIndex: 0,
    category: "armor-body",
    quickSlotCompatible: false,
    equipmentSlot: "bodyArmor",
  },
  {
    id: "helmet",
    label: "Helmet",
    description: "A hard combat helmet with a scarred face plate.",
    spriteIndex: 1,
    category: "armor-head",
    quickSlotCompatible: false,
    equipmentSlot: "helmet",
  },
  {
    id: "pistol-ammo",
    label: "Pistol Ammo",
    description: "A handful of pistol rounds in a small carton.",
    spriteIndex: 2,
    category: "ammo",
    quickSlotCompatible: false,
    ammoSlot: "secondaryWeaponAmmo",
  },
  {
    id: "shotgun-ammo",
    label: "Shotgun Ammo",
    description: "Rough shells packed for close-range work.",
    spriteIndex: 3,
    category: "ammo",
    quickSlotCompatible: false,
    ammoSlot: "mainWeaponAmmo",
  },
  {
    id: "pistol",
    label: "Pistol",
    description: "A reliable sidearm with enough wear to trust.",
    spriteIndex: 4,
    category: "weapon",
    quickSlotCompatible: false,
    fireMode: "semi",
    usesAmmo: "pistol-ammo",
  },
  {
    id: "ump5",
    label: "UMP-5",
    description: "Compact submachine gun built for short bursts.",
    spriteIndex: 5,
    category: "weapon",
    quickSlotCompatible: false,
    fireMode: "auto",
    usesAmmo: "pistol-ammo",
  },
  {
    id: "shotgun",
    label: "Shotgun",
    description: "Heavy scattergun that ends arguments quickly.",
    spriteIndex: 6,
    category: "weapon",
    quickSlotCompatible: false,
    fireMode: "semi",
    usesAmmo: "shotgun-ammo",
  },
  {
    id: "lug-wrench",
    label: "Lug Wrench",
    description: "A heavy wheel wrench that doubles as a brutal tool.",
    spriteIndex: 8,
    category: "melee",
    quickSlotCompatible: true,
  },
  {
    id: "knife",
    label: "Knife",
    description: "A compact field blade for close work and utility.",
    spriteIndex: 9,
    category: "melee",
    quickSlotCompatible: true,
  },
  {
    id: "bandage",
    label: "Bandage",
    description: "Clean wrap for quick patch jobs in the field.",
    spriteIndex: 10,
    category: "medical",
    quickSlotCompatible: true,
  },
  {
    id: "syringe",
    label: "Syringe",
    description: "A sealed injector loaded for emergency use.",
    spriteIndex: 11,
    category: "medical",
    quickSlotCompatible: true,
  },
  {
    id: "water-bottle",
    label: "Water Bottle",
    description: "A clear bottle filled with potable water.",
    spriteIndex: 12,
    category: "consumable",
    quickSlotCompatible: true,
  },
  {
    id: "med-gel",
    label: "Med Gel",
    description: "Fast-acting emergency gel for field treatment.",
    spriteIndex: 13,
    category: "medical",
    quickSlotCompatible: true,
  },
  {
    id: "canned-beans",
    label: "Canned Beans",
    description: "A dented can of beans. Cold, but filling.",
    spriteIndex: 14,
    category: "consumable",
    quickSlotCompatible: true,
  },
  {
    id: "hrc-pack",
    label: "HRC Pack",
    description: "Compressed ration carton stamped with HRC.",
    spriteIndex: 15,
    category: "consumable",
    quickSlotCompatible: true,
  },
] as const;

export const ITEM_IDS = ITEM_DEFINITIONS.map((definition) => definition.id);

const ITEM_BY_ID = new Map<ItemId, ItemDefinition>(
  ITEM_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const getItemDefinition = (id: ItemId): ItemDefinition => {
  const definition = ITEM_BY_ID.get(id);
  if (!definition) {
    throw new Error(`Missing item definition for id '${id}'`);
  }
  return definition;
};

export const canEquipItemInSlot = (itemId: ItemId, slot: EquipmentSlotId): boolean => {
  const definition = getItemDefinition(itemId);
  if (definition.equipmentSlot === slot) {
    return true;
  }

  if (slot === "mainWeapon" || slot === "secondaryWeapon") {
    return definition.category === "weapon" || definition.category === "melee";
  }

  return false;
};

export const canLoadAmmoIntoSlot = (itemId: ItemId, _slot: WeaponAmmoSlotId): boolean => {
  const definition = getItemDefinition(itemId);
  return definition.category === "ammo";
};

export const canWeaponUseAmmo = (weaponItemId: ItemId, ammoItemId: ItemId): boolean => {
  const weapon = getItemDefinition(weaponItemId);
  return weapon.category === "weapon" && weapon.usesAmmo === ammoItemId;
};

export const getItemFireMode = (itemId: ItemId): PlayerFireMode => getItemDefinition(itemId).fireMode ?? "semi";

export const canPlaceItemInQuickSlot = (itemId: ItemId): boolean => getItemDefinition(itemId).quickSlotCompatible;
