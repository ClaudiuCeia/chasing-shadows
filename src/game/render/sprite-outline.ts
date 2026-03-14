const OUTLINE_PADDING = 4;
const OUTLINE_OFFSETS = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

type OutlineCache = Map<string, HTMLCanvasElement>;

type SpriteOutlineOptions = {
  source: CanvasImageSource;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  cache: OutlineCache;
  cacheKey: string;
  color?: string;
  alpha?: number;
  imageSmoothingEnabled?: boolean;
};

const getOutlineMask = ({
  source,
  sourceX,
  sourceY,
  sourceWidth,
  sourceHeight,
  drawWidth,
  drawHeight,
  cache,
  cacheKey,
  color = "rgba(255, 255, 255, 1)",
  imageSmoothingEnabled = false,
}: Omit<SpriteOutlineOptions, "drawX" | "drawY" | "alpha">): HTMLCanvasElement | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(drawWidth) + OUTLINE_PADDING * 2;
  canvas.height = Math.ceil(drawHeight) + OUTLINE_PADDING * 2;
  const maskCtx = canvas.getContext("2d");
  if (!maskCtx) {
    return null;
  }

  maskCtx.imageSmoothingEnabled = imageSmoothingEnabled;
  maskCtx.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    OUTLINE_PADDING,
    OUTLINE_PADDING,
    drawWidth,
    drawHeight,
  );
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.fillStyle = color;
  maskCtx.fillRect(0, 0, canvas.width, canvas.height);
  maskCtx.globalCompositeOperation = "source-over";

  cache.set(cacheKey, canvas);
  return canvas;
};

export const drawSpriteOutline = (
  ctx: CanvasRenderingContext2D,
  options: SpriteOutlineOptions,
): void => {
  const mask = getOutlineMask(options);
  if (!mask) {
    return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = options.imageSmoothingEnabled ?? false;
  ctx.globalAlpha = options.alpha ?? 0.95;
  for (const [offsetX, offsetY] of OUTLINE_OFFSETS) {
    ctx.drawImage(
      mask,
      options.drawX - OUTLINE_PADDING + offsetX,
      options.drawY - OUTLINE_PADDING + offsetY,
    );
  }
  ctx.restore();
};
