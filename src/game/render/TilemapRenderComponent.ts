import { RenderComponent, RenderLayer, Vector2D, type ICamera } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import type { TerminatorModel } from "../world/TerminatorModel.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import type { TileAtlas } from "./TileAtlas.ts";
import { IsometricCameraEntity } from "./IsometricCameraEntity.ts";

export type TilemapRenderPass = "behind-player" | "front-player";

export class TilemapRenderComponent extends RenderComponent {
  private readonly tileWidth: number;
  private readonly tileHeight: number;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly terminator: TerminatorModel,
    private readonly player: PlayerEntity,
    private readonly pass: TilemapRenderPass,
    private readonly atlas: TileAtlas,
    tileWidth: number,
    tileHeight: number,
  ) {
    super(pass === "behind-player" ? RenderLayer.Background : RenderLayer.Foreground);
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  public override isVisible(_camera: ICamera): boolean {
    return true;
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    if (!(camera instanceof IsometricCameraEntity)) return;

    const center = camera.transform.transform.position;
    const playerDepth =
      this.player.transform.transform.position.x + this.player.transform.transform.position.y;
    const radiusX = Math.ceil(canvasSize.x / this.tileWidth) + 8;
    const radiusY = Math.ceil(canvasSize.y / this.tileHeight) + 8;

    const minX = Math.floor(center.x) - radiusX;
    const maxX = Math.floor(center.x) + radiusX;
    const minY = Math.floor(center.y) - radiusY;
    const maxY = Math.floor(center.y) + radiusY;

    const minSum = minX + minY;
    const maxSum = maxX + maxY;

    for (let sum = minSum; sum <= maxSum; sum++) {
      const xStart = Math.max(minX, sum - maxY);
      const xEnd = Math.min(maxX, sum - minY);

      for (let x = xStart; x <= xEnd; x++) {
        const y = sum - x;
        const world = new Vector2D(x, y);
        const tileDepth = x + y;
        const tile = this.map.getTile(x, y);
        const isOccluder = tile.blocking;
        const shouldDrawInPass =
          this.pass === "behind-player"
            ? !isOccluder || tileDepth <= playerDepth
            : isOccluder && tileDepth > playerDepth;
        if (!shouldDrawInPass) {
          continue;
        }

        const screen = camera.toCanvas(world, canvasSize);

        const variantSet = this.atlas.variants[tile.kind];
        const distance = this.terminator.distanceOutsideSafeBand(world);
        const isNeutral = distance <= 0;
        const base = isNeutral
          ? variantSet.neutral
          : this.terminator.getSide(world) === "sun"
            ? variantSet.sun
            : variantSet.dark;

        if (!base) {
          continue;
        }

        const left = Math.floor(screen.x - base.width / 2);
        const top = Math.floor(screen.y - this.tileHeight / 2 - (base.height - this.tileHeight));
        ctx.drawImage(base, left, top);
      }
    }

    if (this.pass === "behind-player") {
      const centerPoint = this.terminator.getCenterPoint();
      const tangent = this.terminator.tangent;
      const half = 200;

      const a = centerPoint.add(tangent.multiply(-half));
      const b = centerPoint.add(tangent.multiply(half));
      const aScreen = camera.toCanvas(a, canvasSize);
      const bScreen = camera.toCanvas(b, canvasSize);

      ctx.strokeStyle = "rgba(255, 235, 170, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(aScreen.x, aScreen.y);
      ctx.lineTo(bScreen.x, bScreen.y);
      ctx.stroke();
    }
  }
}
