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
import {
  VisibilityStateComponent,
  type VisibilityTile,
} from "../components/VisibilityStateComponent.ts";
import { IsometricCameraEntity } from "./IsometricCameraEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { GAME_CONFIG } from "../config/game-config.ts";

type StaticWorldRenderableEntity = {
  id: string;
  getComponent(constr: typeof TilePositionComponent): TilePositionComponent;
};

type ScreenPoint = {
  x: number;
  y: number;
};

type TileCullBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
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
    this.staticObjectQuery = this.runtime.registry
      .query()
      .with(StaticWorldObjectComponent)
      .with(TilePositionComponent);
  }

  public override isVisible(_camera: ICamera): boolean {
    return this.debug.enabled;
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    if (!(camera instanceof IsometricCameraEntity) || !this.debug.enabled) {
      return;
    }

    const cullBounds = this.getTileCullBounds(camera, canvasSize);

    ctx.save();
    this.drawRememberedTiles(ctx, camera, canvasSize, cullBounds);

    for (const tile of this.visibility.getVisibleTiles()) {
      if (!this.isTileWithinCullBounds(tile, cullBounds)) {
        continue;
      }

      this.drawTileOverlay(
        ctx,
        camera,
        canvasSize,
        tile,
        "rgba(80, 214, 127, 0.18)",
        "rgba(80, 214, 127, 0.38)",
        1,
        canvasSize,
      );
    }

    for (const tile of this.visibility.getVisibleStaticObjectTiles()) {
      if (!this.isTileWithinCullBounds(tile, cullBounds)) {
        continue;
      }

      this.drawTileOverlay(
        ctx,
        camera,
        canvasSize,
        tile,
        "rgba(110, 255, 160, 0.22)",
        "rgba(110, 255, 160, 0.92)",
        2,
        canvasSize,
      );
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
    fillStyle: string | null,
    strokeStyle: string,
    lineWidth: number,
    viewportSize: Vector2D,
  ): void {
    const tileData = this.map.getTile(tile.x, tile.y);
    const points: ScreenPoint[] = [
      camera.toCanvasAt(
        new Vector2D(tile.x - 0.5, tile.y - 0.5),
        tileData.corners.northWest,
        canvasSize,
      ),
      camera.toCanvasAt(
        new Vector2D(tile.x + 0.5, tile.y - 0.5),
        tileData.corners.northEast,
        canvasSize,
      ),
      camera.toCanvasAt(
        new Vector2D(tile.x + 0.5, tile.y + 0.5),
        tileData.corners.southEast,
        canvasSize,
      ),
      camera.toCanvasAt(
        new Vector2D(tile.x - 0.5, tile.y + 0.5),
        tileData.corners.southWest,
        canvasSize,
      ),
    ];

    if (!this.isPolygonVisible(points, viewportSize)) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  private drawRememberedTiles(
    ctx: CanvasRenderingContext2D,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
    cullBounds: TileCullBounds,
  ): void {
    for (let y = cullBounds.minY; y <= cullBounds.maxY; y++) {
      for (let x = cullBounds.minX; x <= cullBounds.maxX; x++) {
        if (!this.visibility.isTileRemembered(x, y) || this.visibility.isTileVisible(x, y)) {
          continue;
        }

        this.drawTileOverlay(
          ctx,
          camera,
          canvasSize,
          { x, y },
          null,
          "rgba(128, 180, 255, 0.9)",
          1,
          canvasSize,
        );
      }
    }
  }

  private getTileCullBounds(camera: IsometricCameraEntity, canvasSize: Vector2D): TileCullBounds {
    const center = camera.transform.transform.position;
    const radiusX = Math.ceil(canvasSize.x / GAME_CONFIG.tileWidth) + 8;
    const radiusY = Math.ceil(canvasSize.y / GAME_CONFIG.tileHeight) + 8;
    const verticalPadding =
      Math.ceil(
        (GAME_CONFIG.maxTerrainElevation * camera.getElevationStepPixels()) /
          GAME_CONFIG.tileHeight,
      ) + 2;

    return {
      minX: Math.floor(center.x) - radiusX,
      maxX: Math.floor(center.x) + radiusX,
      minY: Math.floor(center.y) - radiusY - verticalPadding,
      maxY: Math.floor(center.y) + radiusY + verticalPadding + GAME_CONFIG.southCullingPadding,
    };
  }

  private isTileWithinCullBounds(tile: VisibilityTile, bounds: TileCullBounds): boolean {
    return (
      tile.x >= bounds.minX &&
      tile.x <= bounds.maxX &&
      tile.y >= bounds.minY &&
      tile.y <= bounds.maxY
    );
  }

  private isPolygonVisible(points: readonly ScreenPoint[], viewportSize: Vector2D): boolean {
    if (points.length === 0) {
      return false;
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    const padding = 8;
    return !(
      maxX < -padding ||
      maxY < -padding ||
      minX > viewportSize.x + padding ||
      minY > viewportSize.y + padding
    );
  }
}
