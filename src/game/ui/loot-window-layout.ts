import type { UiRect } from "@claudiu-ceia/tick";

export const LOOT_WINDOW_COLUMNS = 4;
export const LOOT_WINDOW_ROWS = 4;
export const LOOT_WINDOW_SLOT_COUNT = LOOT_WINDOW_COLUMNS * LOOT_WINDOW_ROWS;

export const LOOT_WINDOW_GRID = {
  x: 38,
  y: 74,
  gap: 8,
  slotSize: 68,
};

export const getLootSlotAtHudPoint = (frame: UiRect, hudX: number, hudY: number): number | null => {
  const localX = hudX - frame.x - LOOT_WINDOW_GRID.x;
  const localY = hudY - frame.y - LOOT_WINDOW_GRID.y;
  if (localX < 0 || localY < 0) {
    return null;
  }

  const stride = LOOT_WINDOW_GRID.slotSize + LOOT_WINDOW_GRID.gap;
  const column = Math.floor(localX / stride);
  const row = Math.floor(localY / stride);
  if (column < 0 || column >= LOOT_WINDOW_COLUMNS || row < 0 || row >= LOOT_WINDOW_ROWS) {
    return null;
  }

  const withinCellX = localX - column * stride;
  const withinCellY = localY - row * stride;
  if (withinCellX > LOOT_WINDOW_GRID.slotSize || withinCellY > LOOT_WINDOW_GRID.slotSize) {
    return null;
  }

  return row * LOOT_WINDOW_COLUMNS + column;
};
