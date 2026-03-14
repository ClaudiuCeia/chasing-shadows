import type { PlayerFireMode } from "../render/player-animation-logic.ts";
import { ATTACK_REFIRE_SECONDS } from "../render/player-animation-logic.ts";

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
export type AmmoItemId = "pistol-ammo" | "shotgun-ammo";
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

type ItemDefinitionBase<TCategory extends ItemCategory> = {
  id: ItemId;
  label: string;
  description: string;
  spriteIndex: number;
  category: TCategory;
  quickSlotCompatible: boolean;
};

export type ArmorItemDefinition = ItemDefinitionBase<"armor-head" | "armor-body"> & {
  equipmentSlot: EquipmentSlotId;
};

export type AmmoItemDefinition = ItemDefinitionBase<"ammo"> & {
  id: AmmoItemId;
  ammoSlot: WeaponAmmoSlotId;
};

export type RangedWeaponItemDefinition = ItemDefinitionBase<"weapon"> & {
  fireMode: PlayerFireMode;
  refireSeconds: number;
  usesAmmo: AmmoItemId;
  baseDamage: number;
  spreadDegrees: number;
  accuracy: number;
};

export type MeleeWeaponItemDefinition = ItemDefinitionBase<"melee">;

export type ToolItemDefinition = ItemDefinitionBase<"tool">;
export type ConsumableItemDefinition = ItemDefinitionBase<"consumable">;
export type MedicalItemDefinition = ItemDefinitionBase<"medical">;
export type MaterialItemDefinition = ItemDefinitionBase<"material">;
export type ThrowableItemDefinition = ItemDefinitionBase<"throwable">;

export type ItemDefinition =
  | ArmorItemDefinition
  | AmmoItemDefinition
  | RangedWeaponItemDefinition
  | MeleeWeaponItemDefinition
  | ToolItemDefinition
  | ConsumableItemDefinition
  | MedicalItemDefinition
  | MaterialItemDefinition
  | ThrowableItemDefinition;

export type WeaponItemDefinition = RangedWeaponItemDefinition | MeleeWeaponItemDefinition;

export type WeaponCombatStats = Pick<
  RangedWeaponItemDefinition,
  "baseDamage" | "spreadDegrees" | "accuracy" | "fireMode" | "refireSeconds" | "usesAmmo"
>;

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
    refireSeconds: 0.24,
    baseDamage: 18,
    spreadDegrees: 0.75,
    accuracy: 0.98,
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
    refireSeconds: 0.09,
    baseDamage: 9,
    spreadDegrees: 5,
    accuracy: 0.82,
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
    refireSeconds: 0.58,
    baseDamage: 26,
    spreadDegrees: 12,
    accuracy: 0.72,
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

export const isArmorItemDefinition = (definition: ItemDefinition): definition is ArmorItemDefinition =>
  definition.category === "armor-head" || definition.category === "armor-body";

export const isAmmoItemDefinition = (definition: ItemDefinition): definition is AmmoItemDefinition =>
  definition.category === "ammo";

export const isRangedWeaponItemDefinition = (definition: ItemDefinition): definition is RangedWeaponItemDefinition =>
  definition.category === "weapon";

export const isWeaponItemDefinition = (definition: ItemDefinition): definition is WeaponItemDefinition =>
  definition.category === "weapon" || definition.category === "melee";

export const getItemDefinition = (id: ItemId): ItemDefinition => {
  const definition = ITEM_BY_ID.get(id);
  if (!definition) {
    throw new Error(`Missing item definition for id '${id}'`);
  }
  return definition;
};

export const canEquipItemInSlot = (itemId: ItemId, slot: EquipmentSlotId): boolean => {
  const definition = getItemDefinition(itemId);
  if (isArmorItemDefinition(definition) && definition.equipmentSlot === slot) {
    return true;
  }

  if (slot === "mainWeapon" || slot === "secondaryWeapon") {
    return isWeaponItemDefinition(definition);
  }

  return false;
};

export const canLoadAmmoIntoSlot = (itemId: ItemId, _slot: WeaponAmmoSlotId): boolean => {
  const definition = getItemDefinition(itemId);
  return isAmmoItemDefinition(definition);
};

export const canWeaponUseAmmo = (weaponItemId: ItemId, ammoItemId: ItemId): boolean => {
  const weapon = getItemDefinition(weaponItemId);
  return isRangedWeaponItemDefinition(weapon) && weapon.usesAmmo === ammoItemId;
};

export const getItemFireMode = (itemId: ItemId): PlayerFireMode => {
  const definition = getItemDefinition(itemId);
  return isRangedWeaponItemDefinition(definition) ? definition.fireMode : "semi";
};

export const getItemRefireSeconds = (itemId: ItemId): number => {
  const definition = getItemDefinition(itemId);
  return isRangedWeaponItemDefinition(definition) ? definition.refireSeconds : ATTACK_REFIRE_SECONDS;
};

export const getWeaponCombatStats = (itemId: ItemId): WeaponCombatStats | null => {
  const definition = getItemDefinition(itemId);
  if (!isRangedWeaponItemDefinition(definition)) {
    return null;
  }

  return {
    baseDamage: definition.baseDamage,
    spreadDegrees: definition.spreadDegrees,
    accuracy: definition.accuracy,
    fireMode: definition.fireMode,
    refireSeconds: definition.refireSeconds,
    usesAmmo: definition.usesAmmo,
  };
};

export const getWeaponSpreadDegrees = (itemId: ItemId): number => getWeaponCombatStats(itemId)?.spreadDegrees ?? 0;

export const getWeaponAccuracy = (itemId: ItemId): number => getWeaponCombatStats(itemId)?.accuracy ?? 1;

export const getWeaponBaseDamage = (itemId: ItemId): number => getWeaponCombatStats(itemId)?.baseDamage ?? 0;

export const canPlaceItemInQuickSlot = (itemId: ItemId): boolean => getItemDefinition(itemId).quickSlotCompatible;
