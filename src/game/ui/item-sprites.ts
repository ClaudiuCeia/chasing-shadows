import ItemSheetPng from "../../../assets/items/items.png";

export const ITEM_ICON_SIZE = 16;
export const ITEM_SHEET_COLUMNS = 4;

let sheetPromise: Promise<HTMLImageElement> | null = null;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load item sheet image: ${src}`));
    image.src = src;
  });

export const getItemSheet = (): Promise<HTMLImageElement> => {
  if (!sheetPromise) {
    sheetPromise = loadImage(ItemSheetPng);
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
