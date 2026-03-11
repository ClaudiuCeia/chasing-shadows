import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { IsometricRenderableComponent } from "../components/IsometricRenderableComponent.ts";
import { getLootBoxSprites, type BoxSprites } from "./loot-box-sprite-assets.ts";

const BOX_FRAME_SIZE = 18;
const BOX_SHEET_COLUMNS = 5;
const BOX_FRAME_LOOKUP = [0, 1, 4, 5, 6, 9, 10, 11, 15, 20, 21, 22, 24] as const;
const BOX_SCALE = 4.5;

const POINTER_SRC_X = 20;
const POINTER_SRC_WIDTH = 20;
const POINTER_SCALE = 2.5;

export class LootBoxSpriteComponent extends IsometricRenderableComponent {
  public static override type = "loot-box-sprite";
  private static spritesPromise: Promise<BoxSprites> | null = null;

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

    ctx.drawImage(this.sprites.shadow, drawX, drawY + 1, drawSize, drawSize);

    if (isSelected) {
      this.drawSelector(ctx, screen, drawY, drawSize);
    }

    const frame = BOX_FRAME_LOOKUP[this.spriteIndex % BOX_FRAME_LOOKUP.length] ?? BOX_FRAME_LOOKUP[0];
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
