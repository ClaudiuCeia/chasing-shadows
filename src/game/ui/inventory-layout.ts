import type { UiRect } from "@claudiu-ceia/tick";
import type { InventorySlotRef } from "../components/LootUiComponent.ts";
import type { EquipmentSlotId, WeaponAmmoSlotId } from "../items/item-catalog.ts";

export const INVENTORY_SLOT_SIZE = 58;
export const INVENTORY_SLOT_GAP = 10;
export const INVENTORY_SECTION_LEFT = 36;
export const INVENTORY_SECTION_TOP = 74;
export const INVENTORY_LABEL_GAP = 22;
export const INVENTORY_PANEL_GAP = 28;

export const BACKPACK_COLUMNS = 4;
export const BACKPACK_ROWS = 4;
export const SOURCE_COLUMNS = 4;
export const SOURCE_ROWS = 4;

type SlotLayout = {
  ref: InventorySlotRef;
  x: number;
  y: number;
};

const equipmentKey = (key: EquipmentSlotId): InventorySlotRef => ({ section: "equipment", key });
const ammoKey = (key: WeaponAmmoSlotId): InventorySlotRef => ({ section: "weaponAmmo", key });

const weaponColumnX = INVENTORY_SECTION_LEFT;
const armorColumnX = INVENTORY_SECTION_LEFT + INVENTORY_SLOT_SIZE + INVENTORY_SLOT_GAP;
const rowY = (row: number): number =>
  INVENTORY_SECTION_TOP + INVENTORY_LABEL_GAP + row * (INVENTORY_SLOT_SIZE + INVENTORY_SLOT_GAP);

export const EQUIPMENT_LAYOUT: readonly SlotLayout[] = [
  { ref: equipmentKey("mainWeapon"), x: weaponColumnX, y: rowY(0) },
  { ref: ammoKey("mainWeaponAmmo"), x: weaponColumnX, y: rowY(1) },
  { ref: equipmentKey("secondaryWeapon"), x: weaponColumnX, y: rowY(2) },
  { ref: ammoKey("secondaryWeaponAmmo"), x: weaponColumnX, y: rowY(3) },
  { ref: equipmentKey("helmet"), x: armorColumnX, y: rowY(0) },
  { ref: equipmentKey("bodyArmor"), x: armorColumnX, y: rowY(1) },
] as const;

export const QUICKBAR_ORIGIN = {
  x: INVENTORY_SECTION_LEFT,
  y: rowY(4) + 34,
};

export const BACKPACK_ORIGIN = {
  x: INVENTORY_SECTION_LEFT + 176,
  y: INVENTORY_SECTION_TOP + INVENTORY_LABEL_GAP,
};

export const SOURCE_ORIGIN = {
  x: BACKPACK_ORIGIN.x + BACKPACK_COLUMNS * (INVENTORY_SLOT_SIZE + INVENTORY_SLOT_GAP) + INVENTORY_PANEL_GAP,
  y: BACKPACK_ORIGIN.y,
};

export const INVENTORY_MODAL_HEIGHT = 540;

const INVENTORY_MODAL_RIGHT_PADDING = 36;
const INVENTORY_MODAL_BOTTOM_PADDING = 32;

const gridWidth = (columns: number): number => columns * INVENTORY_SLOT_SIZE + (columns - 1) * INVENTORY_SLOT_GAP;

export const INVENTORY_MODAL_WIDTH = {
  inventoryOnly: BACKPACK_ORIGIN.x + gridWidth(BACKPACK_COLUMNS) + INVENTORY_MODAL_RIGHT_PADDING,
  withSource: SOURCE_ORIGIN.x + gridWidth(SOURCE_COLUMNS) + INVENTORY_MODAL_RIGHT_PADDING,
} as const;

export const INVENTORY_MODAL_MIN_HEIGHT =
  QUICKBAR_ORIGIN.y + INVENTORY_SLOT_SIZE + INVENTORY_MODAL_BOTTOM_PADDING;

export const getSlotRect = (frame: UiRect, slot: SlotLayout | { ref: InventorySlotRef; x: number; y: number }) => ({
  x: frame.x + slot.x,
  y: frame.y + slot.y,
  width: INVENTORY_SLOT_SIZE,
  height: INVENTORY_SLOT_SIZE,
});

export const createGridLayout = (
  section: InventorySlotRef["section"],
  count: number,
  columns: number,
  originX: number,
  originY: number,
): SlotLayout[] =>
  Array.from({ length: count }, (_unused, index) => ({
    ref: { section, key: index },
    x: originX + (index % columns) * (INVENTORY_SLOT_SIZE + INVENTORY_SLOT_GAP),
    y: originY + Math.floor(index / columns) * (INVENTORY_SLOT_SIZE + INVENTORY_SLOT_GAP),
  }));

export const getInventorySlotAtHudPoint = (
  frame: UiRect,
  hudX: number,
  hudY: number,
  quickSlotCount: number,
  backpackCount: number,
  sourceCount: number,
): InventorySlotRef | null => {
  const layouts: SlotLayout[] = [
    ...EQUIPMENT_LAYOUT,
    ...createGridLayout("quick", quickSlotCount, quickSlotCount, QUICKBAR_ORIGIN.x, QUICKBAR_ORIGIN.y),
    ...createGridLayout("backpack", backpackCount, BACKPACK_COLUMNS, BACKPACK_ORIGIN.x, BACKPACK_ORIGIN.y),
    ...createGridLayout("source", sourceCount, SOURCE_COLUMNS, SOURCE_ORIGIN.x, SOURCE_ORIGIN.y),
  ];

  for (const layout of layouts) {
    const rect = getSlotRect(frame, layout);
    if (hudX >= rect.x && hudX <= rect.x + rect.width && hudY >= rect.y && hudY <= rect.y + rect.height) {
      return layout.ref;
    }
  }

  return null;
};
