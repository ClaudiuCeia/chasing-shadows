import {
  EcsRuntime,
  RenderComponent,
  RenderLayer,
  Vector2D,
  type EntityQuery,
  type ICamera,
} from "@claudiu-ceia/tick";
import { DebugOverlayComponent } from "../components/DebugOverlayComponent.ts";
import { StaticWorldObjectComponent } from "../components/StaticWorldObjectComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { VisibilityStateComponent, type VisibilityTile } from "../components/VisibilityStateComponent.ts";
import { IsometricCameraEntity } from "./IsometricCameraEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

type StaticWorldRenderableEntity = {
  id: string;
  getComponent(constr: typeof TilePositionComponent): TilePositionComponent;
};

type ScreenPoint = {
  x: number;
  y: number;
};

export class DebugVisibilityRenderComponent extends RenderComponent {
  private staticObjectQuery: EntityQuery | null = null;

  public constructor(
    private readonly debug: DebugOverlayComponent,
    private readonly visibility: VisibilityStateComponent,
    private readonly map: InfiniteTilemap,
    private readonly runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    super(RenderLayer.Foreground);
  }

  public override awake(): void {
    super.awake();
    this.staticObjectQuery = this.runtime.registry.query().with(StaticWorldObjectComponent).with(TilePositionComponent);
  }

  public override isVisible(_camera: ICamera): boolean {
    return this.debug.enabled;
  }

  public override doRender(ctx: CanvasRenderingContext2D, camera: ICamera, canvasSize: Vector2D): void {
    if (!(camera instanceof IsometricCameraEntity) || !this.debug.enabled) {
      return;
    }

    ctx.save();
    for (const tile of this.visibility.getVisibleTiles()) {
      this.drawTileOverlay(ctx, camera, canvasSize, tile, "rgba(80, 214, 127, 0.18)", "rgba(80, 214, 127, 0.38)", 1);
    }

    for (const tile of this.visibility.getVisibleStaticObjectTiles()) {
      this.drawTileOverlay(ctx, camera, canvasSize, tile, "rgba(110, 255, 160, 0.22)", "rgba(110, 255, 160, 0.92)", 2);
    }

    if (this.staticObjectQuery) {
      for (const entity of this.staticObjectQuery.run() as StaticWorldRenderableEntity[]) {
        if (!this.visibility.isStaticObjectVisible(entity.id)) {
          continue;
        }

        const tile = entity.getComponent(TilePositionComponent);
        const screen = camera.toCanvasAt(new Vector2D(tile.x, tile.y), tile.z, canvasSize);
        ctx.fillStyle = "rgba(110, 255, 160, 0.95)";
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 12, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawTileOverlay(
    ctx: CanvasRenderingContext2D,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
    tile: VisibilityTile,
    fillStyle: string,
    strokeStyle: string,
    lineWidth: number,
  ): void {
    const tileData = this.map.getTile(tile.x, tile.y);
    const points: ScreenPoint[] = [
      camera.toCanvasAt(new Vector2D(tile.x - 0.5, tile.y - 0.5), tileData.corners.northWest, canvasSize),
      camera.toCanvasAt(new Vector2D(tile.x + 0.5, tile.y - 0.5), tileData.corners.northEast, canvasSize),
      camera.toCanvasAt(new Vector2D(tile.x + 0.5, tile.y + 0.5), tileData.corners.southEast, canvasSize),
      camera.toCanvasAt(new Vector2D(tile.x - 0.5, tile.y + 0.5), tileData.corners.southWest, canvasSize),
    ];

    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}