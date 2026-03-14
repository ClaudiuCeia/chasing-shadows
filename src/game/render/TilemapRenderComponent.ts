import {
  EcsRuntime,
  RenderComponent,
  RenderLayer,
  Vector2D,
  type EntityQuery,
  type ICamera,
} from "@claudiu-ceia/tick";
import { IsometricRenderNodeComponent } from "../components/IsometricRenderNodeComponent.ts";
import { IsometricRenderableComponent } from "../components/IsometricRenderableComponent.ts";
import { TilemapStateComponent } from "../components/TilemapStateComponent.ts";
import type { TerminatorComponent } from "../components/TerminatorComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { isTileFlat, type TileData, type TileKind } from "../world/tile-types.ts";
import type { TileAtlas, TileLighting } from "./TileAtlas.ts";
import { IsometricCameraEntity } from "./IsometricCameraEntity.ts";
import { parseHexColor, rgbToHex } from "../../shared/math/color.ts";
import { tileKey } from "../../shared/math/tile-key.ts";

export type TilemapRenderOptions = {
  isSelectedAt?: (x: number, y: number, z: number) => boolean;
  maxTerrainElevation?: number;
  southCullingPadding?: number;
};

type IsometricRenderableEntity = {
  components: unknown[];
  getComponent(constr: typeof TilePositionComponent): TilePositionComponent;
};

type ScreenPoint = {
  x: number;
  y: number;
};

type TileCornerPoints = {
  northWest: ScreenPoint;
  northEast: ScreenPoint;
  southEast: ScreenPoint;
  southWest: ScreenPoint;
};

type TileRenderEntry = {
  depth: number;
  tile: TileData;
  lighting: TileLighting;
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  screen: ScreenPoint;
  corners: TileCornerPoints;
  left: number;
  top: number;
  flat: boolean;
  eastDrop: number;
  southDrop: number;
};

type FaceCommand = {
  kind: "east-face" | "south-face";
  depth: number;
  screenY: number;
  entry: TileRenderEntry;
  neighbor: TileRenderEntry;
};

type EntityCommand = {
  kind: "entity";
  depth: number;
  screenY: number;
  screen: Vector2D;
  renderable: IsometricRenderableComponent;
  selected: boolean;
};

type OverlayCommand = FaceCommand | EntityCommand;

type TileColorCache = Record<
  TileKind,
  {
    top: Record<TileLighting, string>;
    east: string;
    south: string;
  }
>;

const createTopLightingSet = (
  neutral: string,
  sun: string,
  dark: string,
): Record<TileLighting, string> => ({ neutral, sun, dark });

type CameraProjection = {
  cameraIsoX: number;
  cameraIsoY: number;
  halfCanvasWidth: number;
  halfCanvasHeight: number;
  halfTileWidth: number;
  halfTileHeight: number;
  elevationStepPixels: number;
};

const DEPTH_EPSILON = 1e-5;
const FLOOR_TILE_DEPTH_BIAS = 1;
const ENTITY_DEPTH_EPSILON = 0.001;
const DEFAULT_MAX_TERRAIN_ELEVATION = 6;
const DEFAULT_SOUTH_CULLING_PADDING = 5;

const blendColor = (baseHex: string, tintHex: string, amount: number): string => {
  const t = Math.max(0, Math.min(1, amount));
  const base = parseHexColor(baseHex);
  const tint = parseHexColor(tintHex);
  return rgbToHex({
    r: base.r + (tint.r - base.r) * t,
    g: base.g + (tint.g - base.g) * t,
    b: base.b + (tint.b - base.b) * t,
  });
};

const snapScreenPoint = (point: ScreenPoint): ScreenPoint => ({
  x: Math.floor(point.x),
  y: Math.floor(point.y),
});

const fillPolygon = (
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  fillStyle: string,
  strokeStyle?: string,
): void => {
  if (points.length === 0) {
    return;
  }

  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.closePath();
  ctx.fill();

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
};

const createTileColorCache = (atlas: TileAtlas): TileColorCache => ({
  regolith: {
    top: createTopLightingSet(
      atlas.palettes.regolith.neutral,
      atlas.palettes.regolith.sun,
      atlas.palettes.regolith.dark,
    ),
    east: blendColor(atlas.palettes.regolith.neutral, "#000000", 0.18),
    south: blendColor(atlas.palettes.regolith.neutral, "#000000", 0.26),
  },
  rock: {
    top: createTopLightingSet(
      atlas.palettes.rock.neutral,
      atlas.palettes.rock.sun,
      atlas.palettes.rock.dark,
    ),
    east: blendColor(atlas.palettes.rock.neutral, "#000000", 0.18),
    south: blendColor(atlas.palettes.rock.neutral, "#000000", 0.26),
  },
  scrap: {
    top: createTopLightingSet(
      atlas.palettes.scrap.neutral,
      atlas.palettes.scrap.sun,
      atlas.palettes.scrap.dark,
    ),
    east: blendColor(atlas.palettes.scrap.neutral, "#000000", 0.18),
    south: blendColor(atlas.palettes.scrap.neutral, "#000000", 0.26),
  },
  shelter: {
    top: createTopLightingSet(
      atlas.palettes.shelter.neutral,
      atlas.palettes.shelter.sun,
      atlas.palettes.shelter.dark,
    ),
    east: blendColor(atlas.palettes.shelter.neutral, "#000000", 0.18),
    south: blendColor(atlas.palettes.shelter.neutral, "#000000", 0.26),
  },
});

export class TilemapRenderComponent extends RenderComponent {
  private readonly runtime: EcsRuntime;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  private readonly colorCache: TileColorCache;
  private renderNodeQuery: EntityQuery | null = null;

  public constructor(
    private readonly map: TilemapStateComponent,
    private readonly terminator: TerminatorComponent,
    private readonly atlas: TileAtlas,
    tileWidth: number,
    tileHeight: number,
    private readonly options?: TilemapRenderOptions,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    super(RenderLayer.Background);
    this.runtime = runtime;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.colorCache = createTileColorCache(atlas);
  }

  public override awake(): void {
    super.awake();
    this.renderNodeQuery = this.runtime.registry
      .query()
      .with(IsometricRenderNodeComponent, TilePositionComponent);
  }

  public override isVisible(_camera: ICamera): boolean {
    return true;
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    if (!(camera instanceof IsometricCameraEntity)) {
      return;
    }

    const center = camera.transform.transform.position;
    const radiusX = Math.ceil(canvasSize.x / this.tileWidth) + 8;
    const radiusY = Math.ceil(canvasSize.y / this.tileHeight) + 8;
    const maxTerrainElevation = this.options?.maxTerrainElevation ?? DEFAULT_MAX_TERRAIN_ELEVATION;
    const southCullingPadding = this.options?.southCullingPadding ?? DEFAULT_SOUTH_CULLING_PADDING;
    const verticalPadding =
      Math.ceil((maxTerrainElevation * camera.getElevationStepPixels()) / this.tileHeight) + 2;
    const minX = Math.floor(center.x) - radiusX;
    const maxX = Math.floor(center.x) + radiusX;
    const minY = Math.floor(center.y) - radiusY - verticalPadding;
    const maxY = Math.floor(center.y) + radiusY + verticalPadding + southCullingPadding;
    const projection = this.createProjection(camera, canvasSize);

    const tileEntries = this.buildTileEntries(
      minX,
      maxX,
      minY,
      maxY,
      projection,
      canvasSize,
      maxTerrainElevation,
    );

    tileEntries.visible.sort((a, b) => {
      const depthDelta = a.depth - b.depth;
      if (Math.abs(depthDelta) > DEPTH_EPSILON) {
        return depthDelta;
      }

      const yDelta = a.y - b.y;
      if (yDelta !== 0) {
        return yDelta;
      }

      return a.x - b.x;
    });

    for (const entry of tileEntries.visible) {
      this.drawTopFace(ctx, entry);
    }

    const overlayCommands = this.collectOverlayCommands(
      tileEntries,
      minX,
      maxX,
      minY,
      maxY,
      projection,
    );
    overlayCommands.sort((a, b) => {
      const depthDelta = a.depth - b.depth;
      if (Math.abs(depthDelta) > DEPTH_EPSILON) {
        return depthDelta;
      }

      const screenYDelta = a.screenY - b.screenY;
      if (Math.abs(screenYDelta) > DEPTH_EPSILON) {
        return screenYDelta;
      }

      if (a.kind !== b.kind) {
        return a.kind === "entity" ? -1 : 1;
      }

      if (a.kind !== "entity" && b.kind !== "entity") {
        const yDelta = a.entry.y - b.entry.y;
        if (yDelta !== 0) {
          return yDelta;
        }

        return a.entry.x - b.entry.x;
      }

      return 0;
    });

    for (const command of overlayCommands) {
      if (command.kind === "entity") {
        command.renderable.renderIsometric(ctx, command.screen, command.selected);
      } else if (command.kind === "east-face") {
        this.drawEastFace(ctx, command);
      } else {
        this.drawSouthFace(ctx, command);
      }
    }

    const centerX = this.terminator.getCenterX();
    const centerY = this.terminator.getCenterY();
    const tangentX = this.terminator.tangent.x;
    const tangentY = this.terminator.tangent.y;
    const half = 200;
    const a = this.projectPoint(
      centerX - tangentX * half,
      centerY - tangentY * half,
      0,
      projection,
    );
    const b = this.projectPoint(
      centerX + tangentX * half,
      centerY + tangentY * half,
      0,
      projection,
    );

    ctx.strokeStyle = "rgba(255, 235, 170, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  private createProjection(camera: IsometricCameraEntity, canvasSize: Vector2D): CameraProjection {
    const cameraPosition = camera.transform.transform.position;
    const halfTileWidth = this.tileWidth / 2;
    const halfTileHeight = this.tileHeight / 2;
    const cameraIsoX = (cameraPosition.x - cameraPosition.y) * halfTileWidth;
    const cameraIsoY = (cameraPosition.x + cameraPosition.y) * halfTileHeight;

    return {
      cameraIsoX,
      cameraIsoY,
      halfCanvasWidth: canvasSize.x / 2,
      halfCanvasHeight: canvasSize.y / 2,
      halfTileWidth,
      halfTileHeight,
      elevationStepPixels: camera.getElevationStepPixels(),
    };
  }

  private projectPoint(
    x: number,
    y: number,
    elevation: number,
    projection: CameraProjection,
  ): ScreenPoint {
    const isoX = (x - y) * projection.halfTileWidth;
    const isoY = (x + y) * projection.halfTileHeight - elevation * projection.elevationStepPixels;
    return {
      x: isoX - projection.cameraIsoX + projection.halfCanvasWidth,
      y: isoY - projection.cameraIsoY + projection.halfCanvasHeight,
    };
  }

  private buildTileEntries(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    projection: CameraProjection,
    canvasSize: Vector2D,
    maxTerrainElevation: number,
  ): { visible: TileRenderEntry[]; byKey: Map<string, TileRenderEntry> } {
    const visible: TileRenderEntry[] = [];
    const byKey = new Map<string, TileRenderEntry>();
    const offscreenBufferX = this.tileWidth;
    const offscreenBufferY = this.tileHeight + maxTerrainElevation * projection.elevationStepPixels;

    for (let y = minY; y <= maxY + 1; y++) {
      for (let x = minX; x <= maxX + 1; x++) {
        const tile = this.map.getTile(x, y);
        const distance = this.terminator.distanceOutsideSafeBandXY(x, y);
        const lighting: TileLighting =
          distance <= 0 ? "neutral" : this.terminator.getSideXY(x, y) === "sun" ? "sun" : "dark";

        const screen = this.projectPoint(x, y, tile.elevation, projection);
        const corners = this.getCornerPointsForTile(x, y, tile, projection);
        const flat = isTileFlat(tile);
        const sprite = this.atlas.variants[tile.kind][lighting];
        const tileDepth = x + y + tile.elevation;
        const drawDepth = tile.occluder ? tileDepth : tileDepth - FLOOR_TILE_DEPTH_BIAS;
        const entry: TileRenderEntry = {
          depth: drawDepth,
          tile,
          lighting,
          sprite,
          x,
          y,
          screen,
          corners,
          left: Math.floor(screen.x - sprite.width / 2),
          top: Math.floor(screen.y - this.tileHeight / 2 - (sprite.height - this.tileHeight)),
          flat,
          eastDrop: 0,
          southDrop: 0,
        };

        byKey.set(tileKey(x, y), entry);
        if (
          x <= maxX &&
          y <= maxY &&
          screen.x >= -offscreenBufferX &&
          screen.x <= canvasSize.x + offscreenBufferX &&
          screen.y >= -offscreenBufferY &&
          screen.y <= canvasSize.y + offscreenBufferY
        ) {
          visible.push(entry);
        }
      }
    }

    for (const entry of visible) {
      const eastNeighbor = byKey.get(tileKey(entry.x + 1, entry.y));
      const southNeighbor = byKey.get(tileKey(entry.x, entry.y + 1));
      if (eastNeighbor) {
        entry.eastDrop = Math.max(
          0,
          entry.tile.corners.northEast - eastNeighbor.tile.corners.northWest,
          entry.tile.corners.southEast - eastNeighbor.tile.corners.southWest,
        );
      }
      if (southNeighbor) {
        entry.southDrop = Math.max(
          0,
          entry.tile.corners.southWest - southNeighbor.tile.corners.northWest,
          entry.tile.corners.southEast - southNeighbor.tile.corners.northEast,
        );
      }
    }

    return { visible, byKey };
  }

  private collectOverlayCommands(
    tileEntries: { visible: TileRenderEntry[]; byKey: Map<string, TileRenderEntry> },
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    projection: CameraProjection,
  ): OverlayCommand[] {
    const commands: OverlayCommand[] = [];

    for (const entry of tileEntries.visible) {
      if (entry.eastDrop > 0) {
        const neighbor = tileEntries.byKey.get(tileKey(entry.x + 1, entry.y));
        if (neighbor) {
          commands.push({
            kind: "east-face",
            depth: entry.depth + 0.2,
            screenY: entry.screen.y,
            entry,
            neighbor,
          });
        }
      }

      if (entry.southDrop > 0) {
        const neighbor = tileEntries.byKey.get(tileKey(entry.x, entry.y + 1));
        if (neighbor) {
          commands.push({
            kind: "south-face",
            depth: entry.depth + 0.3,
            screenY: entry.screen.y,
            entry,
            neighbor,
          });
        }
      }
    }

    if (!this.renderNodeQuery) {
      return commands;
    }

    for (const entity of this.renderNodeQuery.run() as IsometricRenderableEntity[]) {
      const position = entity.getComponent(TilePositionComponent);
      if (position.x < minX || position.x > maxX || position.y < minY || position.y > maxY) {
        continue;
      }

      const renderables = entity.components.filter(
        (component): component is IsometricRenderableComponent =>
          component instanceof IsometricRenderableComponent,
      );
      if (renderables.length === 0) {
        continue;
      }

      const screenPoint = this.projectPoint(position.x, position.y, position.z, projection);
      const screen = new Vector2D(screenPoint.x, screenPoint.y);
      const selected = this.options?.isSelectedAt?.(position.x, position.y, position.z) ?? false;

      for (const renderable of renderables) {
        commands.push({
          kind: "entity",
          depth:
            position.x + position.y + position.z + renderable.sortOffset + ENTITY_DEPTH_EPSILON,
          screenY: screenPoint.y,
          screen,
          renderable,
          selected,
        });
      }
    }

    return commands;
  }

  private drawTopFace(ctx: CanvasRenderingContext2D, entry: TileRenderEntry): void {
    if (entry.flat) {
      ctx.drawImage(entry.sprite, entry.left, entry.top);
      return;
    }

    fillPolygon(
      ctx,
      [
        entry.corners.northWest,
        entry.corners.northEast,
        entry.corners.southEast,
        entry.corners.southWest,
      ],
      this.colorCache[entry.tile.kind].top[entry.lighting],
      "rgba(0, 0, 0, 0.12)",
    );
  }

  private drawEastFace(ctx: CanvasRenderingContext2D, command: FaceCommand): void {
    fillPolygon(
      ctx,
      [
        command.entry.corners.northEast,
        command.entry.corners.southEast,
        command.neighbor.corners.southWest,
        command.neighbor.corners.northWest,
      ],
      this.colorCache[command.entry.tile.kind].east,
    );
  }

  private drawSouthFace(ctx: CanvasRenderingContext2D, command: FaceCommand): void {
    fillPolygon(
      ctx,
      [
        command.entry.corners.southWest,
        command.entry.corners.southEast,
        command.neighbor.corners.northEast,
        command.neighbor.corners.northWest,
      ],
      this.colorCache[command.entry.tile.kind].south,
    );
  }

  private getCornerPointsForTile(
    x: number,
    y: number,
    tile: TileData,
    projection: CameraProjection,
  ): TileCornerPoints {
    return {
      northWest: snapScreenPoint(
        this.projectPoint(x - 0.5, y - 0.5, tile.corners.northWest, projection),
      ),
      northEast: snapScreenPoint(
        this.projectPoint(x + 0.5, y - 0.5, tile.corners.northEast, projection),
      ),
      southEast: snapScreenPoint(
        this.projectPoint(x + 0.5, y + 0.5, tile.corners.southEast, projection),
      ),
      southWest: snapScreenPoint(
        this.projectPoint(x - 0.5, y + 0.5, tile.corners.southWest, projection),
      ),
    };
  }
}
