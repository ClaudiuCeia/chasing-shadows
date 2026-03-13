import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { HighlightComponent } from "../components/HighlightComponent.ts";
import { IsometricRenderableComponent } from "../components/IsometricRenderableComponent.ts";
import { getLootBoxSprites, type BoxSprites } from "./loot-box-sprite-assets.ts";

const BOX_FRAME_SIZE = 18;
const BOX_SHEET_COLUMNS = 5;
const BOX_FRAME_LOOKUP = [0, 1, 4, 5, 6, 9, 10, 11, 15, 20, 21, 22, 24] as const;
const BOX_SCALE = 4.5;

const POINTER_SRC_X = 20;
const POINTER_SRC_WIDTH = 20;
const POINTER_SCALE = 2.5;
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

type OutlineMaskRecord = {
  frame: number;
  canvas: HTMLCanvasElement;
};

export class LootBoxSpriteComponent extends IsometricRenderableComponent {
  private static spritesPromise: Promise<BoxSprites> | null = null;
  private static outlineMaskCache = new Map<string, OutlineMaskRecord>();

  private sprites: BoxSprites | null = null;
  public spriteIndex: number;

  public constructor(spriteIndex: number) {
    super();
    this.spriteIndex = Math.max(0, Math.floor(spriteIndex));

    if (typeof Image === "undefined") {
      return;
    }

    if (!LootBoxSpriteComponent.spritesPromise) {
      LootBoxSpriteComponent.spritesPromise = getLootBoxSprites(EcsRuntime.getCurrent());
    }

    LootBoxSpriteComponent.spritesPromise!
      .then((sprites) => {
        this.sprites = sprites;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  public setSpriteIndex(value: number): void {
    this.spriteIndex = Math.max(0, Math.floor(value));
  }

  public override renderIsometric(
    ctx: CanvasRenderingContext2D,
    screen: Vector2D,
    isSelected: boolean,
  ): void {
    if (!this.sprites) {
      return;
    }

    const drawSize = BOX_FRAME_SIZE * BOX_SCALE;
    const drawX = Math.floor(screen.x - drawSize / 2);
    const drawY = Math.floor(screen.y - drawSize + 6);
    const frame = BOX_FRAME_LOOKUP[this.spriteIndex % BOX_FRAME_LOOKUP.length] ?? BOX_FRAME_LOOKUP[0];
    const highlighted = this.ent.hasComponent(HighlightComponent) && this.ent.getComponent(HighlightComponent).active;

    ctx.drawImage(this.sprites.shadow, drawX, drawY + 1, drawSize, drawSize);

    if (highlighted) {
      this.drawOutline(ctx, drawX, drawY, drawSize, frame);
    }

    if (isSelected) {
      this.drawSelector(ctx, screen, drawY, drawSize);
    }

    const sx = (frame % BOX_SHEET_COLUMNS) * BOX_FRAME_SIZE;
    const sy = Math.floor(frame / BOX_SHEET_COLUMNS) * BOX_FRAME_SIZE;

    ctx.drawImage(
      this.sprites.sheet,
      sx,
      sy,
      BOX_FRAME_SIZE,
      BOX_FRAME_SIZE,
      drawX,
      drawY,
      drawSize,
      drawSize,
    );
  }

  private drawOutline(
    ctx: CanvasRenderingContext2D,
    drawX: number,
    drawY: number,
    drawSize: number,
    frame: number,
  ): void {
    const mask = this.getOutlineMask(frame, drawSize);
    if (!mask) {
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.95;
    for (const [offsetX, offsetY] of OUTLINE_OFFSETS) {
      ctx.drawImage(mask, drawX - OUTLINE_PADDING + offsetX, drawY - OUTLINE_PADDING + offsetY);
    }
    ctx.restore();
  }

  private getOutlineMask(frame: number, drawSize: number): HTMLCanvasElement | null {
    if (!this.sprites || typeof document === "undefined") {
      return null;
    }

    const key = `${frame}:${drawSize}`;
    const cached = LootBoxSpriteComponent.outlineMaskCache.get(key);
    if (cached) {
      return cached.canvas;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(drawSize) + OUTLINE_PADDING * 2;
    canvas.height = Math.ceil(drawSize) + OUTLINE_PADDING * 2;
    const maskCtx = canvas.getContext("2d");
    if (!maskCtx) {
      return null;
    }
    maskCtx.imageSmoothingEnabled = false;

    const sx = (frame % BOX_SHEET_COLUMNS) * BOX_FRAME_SIZE;
    const sy = Math.floor(frame / BOX_SHEET_COLUMNS) * BOX_FRAME_SIZE;
    maskCtx.drawImage(
      this.sprites.sheet,
      sx,
      sy,
      BOX_FRAME_SIZE,
      BOX_FRAME_SIZE,
      OUTLINE_PADDING,
      OUTLINE_PADDING,
      drawSize,
      drawSize,
    );
    maskCtx.globalCompositeOperation = "source-in";
    maskCtx.fillStyle = "rgba(255, 255, 255, 1)";
    maskCtx.fillRect(0, 0, canvas.width, canvas.height);
    maskCtx.globalCompositeOperation = "source-over";

    LootBoxSpriteComponent.outlineMaskCache.set(key, { frame, canvas });
    return canvas;
  }

  private drawSelector(
    ctx: CanvasRenderingContext2D,
    screen: Vector2D,
    drawY: number,
    drawSize: number,
  ): void {
    if (!this.sprites) {
      return;
    }

    const pointerW = Math.floor(POINTER_SRC_WIDTH * POINTER_SCALE);
    const pointerH = Math.floor(BOX_FRAME_SIZE * POINTER_SCALE);
    const pointerX = Math.floor(screen.x - pointerW / 2);
    const pointerY = Math.floor(drawY + drawSize * 0.16);

    ctx.drawImage(
      this.sprites.pointer,
      POINTER_SRC_X,
      0,
      POINTER_SRC_WIDTH,
      BOX_FRAME_SIZE,
      pointerX,
      pointerY,
      pointerW,
      pointerH,
    );
  }
}
