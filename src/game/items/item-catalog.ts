export type ItemId =
  | "wire"
  | "battery"
  | "water"
  | "ration"
  | "ore"
  | "fiber"
  | "chip"
  | "scrap-metal"
  | "sealant"
  | "ice"
  | "dust"
  | "circuit"
  | "med-gel"
  | "fuel"
  | "alloy";

export type ItemStack = {
  itemId: ItemId;
  count: number;
};

export type ItemDefinition = {
  id: ItemId;
  label: string;
  spriteIndex: number;
};

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  { id: "wire", label: "Wire", spriteIndex: 0 },
  { id: "battery", label: "Battery", spriteIndex: 1 },
  { id: "water", label: "Water", spriteIndex: 2 },
  { id: "ration", label: "Ration", spriteIndex: 3 },
  { id: "ore", label: "Ore", spriteIndex: 4 },
  { id: "fiber", label: "Fiber", spriteIndex: 5 },
  { id: "chip", label: "Chip", spriteIndex: 6 },
  { id: "scrap-metal", label: "Scrap", spriteIndex: 8 },
  { id: "sealant", label: "Sealant", spriteIndex: 9 },
  { id: "ice", label: "Ice", spriteIndex: 10 },
  { id: "dust", label: "Dust", spriteIndex: 11 },
  { id: "circuit", label: "Circuit", spriteIndex: 12 },
  { id: "med-gel", label: "Med Gel", spriteIndex: 13 },
  { id: "fuel", label: "Fuel", spriteIndex: 14 },
  { id: "alloy", label: "Alloy", spriteIndex: 15 },
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
