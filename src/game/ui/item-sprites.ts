import { EcsRuntime, defineAssetManifest } from "@claudiu-ceia/tick";
import ItemSheetPng from "../../../assets/items/items.png";

const ITEM_SPRITE_MANIFEST = defineAssetManifest({
  images: {
    sheet: ItemSheetPng,
  },
});

export const ITEM_ICON_SIZE = 16;
export const ITEM_SHEET_COLUMNS = 4;

let sheetPromise: Promise<HTMLImageElement> | null = null;

export const getItemSheet = (
  runtime: EcsRuntime = EcsRuntime.getCurrent(),
): Promise<HTMLImageElement> => {
  if (!sheetPromise) {
    sheetPromise = runtime.assets
      .load(ITEM_SPRITE_MANIFEST, { scopeLabel: "item-sprites" })
      .then((assets) => assets.images.sheet);
  }

  return sheetPromise;
};

export const drawItemSprite = (
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  spriteIndex: number,
  dx: number,
  dy: number,
  size: number,
): void => {
  const index = Math.max(0, Math.floor(spriteIndex));
  const sx = (index % ITEM_SHEET_COLUMNS) * ITEM_ICON_SIZE;
  const sy = Math.floor(index / ITEM_SHEET_COLUMNS) * ITEM_ICON_SIZE;

  ctx.drawImage(sheet, sx, sy, ITEM_ICON_SIZE, ITEM_ICON_SIZE, dx, dy, size, size);
};
