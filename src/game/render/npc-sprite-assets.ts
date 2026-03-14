import { EcsRuntime } from "@claudiu-ceia/tick";
import { getPlayerSheets } from "./player-sprite-assets.ts";

export type NpcSheets = {
  idle: HTMLCanvasElement;
  walk: HTMLCanvasElement;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

const NPC_PALETTE = {
  shadow: { r: 45, g: 24, b: 34 },
  mid: { r: 128, g: 55, b: 69 },
  light: { r: 236, g: 139, b: 111 },
} satisfies Record<"shadow" | "mid" | "light", Rgb>;

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => ({
  r: Math.round(a.r + (b.r - a.r) * t),
  g: Math.round(a.g + (b.g - a.g) * t),
  b: Math.round(a.b + (b.b - a.b) * t),
});

const createPaletteColor = (luminance: number): Rgb => {
  const t = Math.max(0, Math.min(1, luminance));
  if (t <= 0.5) {
    return mixRgb(NPC_PALETTE.shadow, NPC_PALETTE.mid, t / 0.5);
  }

  return mixRgb(NPC_PALETTE.mid, NPC_PALETTE.light, (t - 0.5) / 0.5);
};

const createPaletteSwappedSheet = (source: CanvasImageSource, width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return canvas;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, width, height);

  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }

    const red = data[i] ?? 0;
    const green = data[i + 1] ?? 0;
    const blue = data[i + 2] ?? 0;
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    const mapped = createPaletteColor(luminance);
    data[i] = mapped.r;
    data[i + 1] = mapped.g;
    data[i + 2] = mapped.b;
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
};

let npcSheetsPromise: Promise<NpcSheets> | null = null;

export const getNpcSheets = (
  runtime: EcsRuntime = EcsRuntime.getCurrent(),
): Promise<NpcSheets> => {
  if (!npcSheetsPromise) {
    npcSheetsPromise = getPlayerSheets(runtime).then((playerSheets) => ({
      idle: createPaletteSwappedSheet(playerSheets.idle, playerSheets.idle.width, playerSheets.idle.height),
      walk: createPaletteSwappedSheet(playerSheets.walk, playerSheets.walk.width, playerSheets.walk.height),
    }));
  }

  return npcSheetsPromise;
};
