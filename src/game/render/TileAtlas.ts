import type { TileKind } from "../world/tile-types.ts";

export type TileLighting = "neutral" | "sun" | "dark";

export type TilePalette = {
  neutral: string;
  sun: string;
  dark: string;
  raised: boolean;
};

export type TileAtlas = {
  variants: Record<
    TileKind,
    {
      neutral: HTMLCanvasElement;
      sun: HTMLCanvasElement;
      dark: HTMLCanvasElement;
    }
  >;
  palettes: Record<TileKind, TilePalette>;
};

type Rgb = { r: number; g: number; b: number };

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
};

const clampChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const parseHexColor = (hex: string): Rgb => {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    throw new Error(`Expected 6-char hex color, got '${hex}'`);
  }

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return { r, g, b };
};

const rgbToHex = ({ r, g, b }: Rgb): string => {
  const toHex = (channel: number): string => clampChannel(channel).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const blend = (baseHex: string, tintHex: string, amount: number): string => {
  const t = Math.max(0, Math.min(1, amount));
  const base = parseHexColor(baseHex);
  const tint = parseHexColor(tintHex);

  return rgbToHex({
    r: base.r + (tint.r - base.r) * t,
    g: base.g + (tint.g - base.g) * t,
    b: base.b + (tint.b - base.b) * t,
  });
};

const darken = (hex: string, amount: number): string => blend(hex, "#000000", amount);

const drawDiamond = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  fill: string,
): void => {
  const hw = width / 2;
  const hh = height / 2;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY - hh);
  ctx.lineTo(centerX + hw, centerY);
  ctx.lineTo(centerX, centerY + hh);
  ctx.lineTo(centerX - hw, centerY);
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();
};

const createFlatTile = (tileWidth: number, tileHeight: number, color: string): HTMLCanvasElement => {
  const canvas = createCanvas(tileWidth, tileHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create tile atlas context");
  }

  const cx = tileWidth / 2;
  const cy = tileHeight / 2;

  drawDiamond(ctx, cx, cy, tileWidth, tileHeight, color);
  return canvas;
};

const createRockTile = (
  tileWidth: number,
  tileHeight: number,
  topColor: string,
): HTMLCanvasElement => {
  const raise = Math.max(6, Math.floor(tileHeight * 0.6));
  const canvas = createCanvas(tileWidth, tileHeight + raise);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create tile atlas context");
  }

  const hw = tileWidth / 2;
  const hh = tileHeight / 2;
  const centerX = hw;
  const topCenterY = hh;
  const groundCenterY = hh + raise;

  const top = { x: centerX, y: topCenterY - hh };
  const right = { x: centerX + hw, y: topCenterY };
  const bottom = { x: centerX, y: topCenterY + hh };
  const left = { x: centerX - hw, y: topCenterY };

  const sideLeft = darken(topColor, 0.42);
  const sideRight = darken(topColor, 0.3);

  const groundRight = { x: right.x, y: groundCenterY };
  const groundBottom = { x: bottom.x, y: groundCenterY + hh };
  const groundLeft = { x: left.x, y: groundCenterY };

  ctx.beginPath();
  ctx.moveTo(bottom.x, bottom.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(groundRight.x, groundRight.y);
  ctx.lineTo(groundBottom.x, groundBottom.y);
  ctx.closePath();
  ctx.fillStyle = sideRight;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(groundBottom.x, groundBottom.y);
  ctx.lineTo(groundLeft.x, groundLeft.y);
  ctx.closePath();
  ctx.fillStyle = sideLeft;
  ctx.fill();

  drawDiamond(ctx, centerX, topCenterY, tileWidth, tileHeight, topColor);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.stroke();

  return canvas;
};

const createVariantSet = (
  tileWidth: number,
  tileHeight: number,
  palette: TilePalette,
): { neutral: HTMLCanvasElement; sun: HTMLCanvasElement; dark: HTMLCanvasElement } => {
  const draw = (color: string): HTMLCanvasElement =>
    palette.raised
      ? createRockTile(tileWidth, tileHeight, color)
      : createFlatTile(tileWidth, tileHeight, color);

  return {
    neutral: draw(palette.neutral),
    sun: draw(palette.sun),
    dark: draw(palette.dark),
  };
};

const BASE_TILE_COLORS: Record<TileKind, { base: string; raised: boolean }> = {
  regolith: { base: "#7a6c57", raised: false },
  scrap: { base: "#8f7c55", raised: false },
  shelter: { base: "#5e7469", raised: false },
  rock: { base: "#7b7269", raised: true },
};

const createTilePalette = (baseColor: string, raised: boolean): TilePalette => ({
  neutral: baseColor,
  sun: blend(baseColor, "#b26139", 0.22),
  dark: blend(baseColor, "#36557f", 0.28),
  raised,
});

export const createTileAtlas = (tileWidth: number, tileHeight: number): TileAtlas => {
  const palettes: Record<TileKind, TilePalette> = {
    regolith: createTilePalette(BASE_TILE_COLORS.regolith.base, BASE_TILE_COLORS.regolith.raised),
    scrap: createTilePalette(BASE_TILE_COLORS.scrap.base, BASE_TILE_COLORS.scrap.raised),
    shelter: createTilePalette(BASE_TILE_COLORS.shelter.base, BASE_TILE_COLORS.shelter.raised),
    rock: createTilePalette(BASE_TILE_COLORS.rock.base, BASE_TILE_COLORS.rock.raised),
  };

  return {
    variants: {
      regolith: createVariantSet(tileWidth, tileHeight, palettes.regolith),
      scrap: createVariantSet(tileWidth, tileHeight, palettes.scrap),
      shelter: createVariantSet(tileWidth, tileHeight, palettes.shelter),
      rock: createVariantSet(tileWidth, tileHeight, palettes.rock),
    },
    palettes,
  };
};
