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
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import type { TerminatorModel } from "../world/TerminatorModel.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { isTileFlat, type TileData } from "../world/tile-types.ts";
import type { TileAtlas, TileLighting } from "./TileAtlas.ts";
import { IsometricCameraEntity } from "./IsometricCameraEntity.ts";

export type TilemapRenderOptions = {
  isSelectedAt?: (x: number, y: number, z: number) => boolean;
  maxTerrainElevation?: number;
  southCullingPadding?: number;
};

type IsometricRenderableEntity = {
  components: unknown[];
  getComponent(constr: typeof TilePositionComponent): TilePositionComponent;
};

type TileCommand = {
  depth: number;
  tile: TileData;
  lighting: TileLighting;
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  screen: Vector2D;
};

type FaceCommand = {
  kind: "east-face" | "south-face";
  depth: number;
  tile: TileData;
  lighting: TileLighting;
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  screen: Vector2D;
};

type EntityCommand = {
  kind: "entity";
  depth: number;
  screen: Vector2D;
  renderable: IsometricRenderableComponent;
  selected: boolean;
};

type OverlayCommand = FaceCommand | EntityCommand;

type TileCornerPoints = {
  northWest: Vector2D;
  northEast: Vector2D;
  southEast: Vector2D;
  southWest: Vector2D;
};

type Rgb = { r: number; g: number; b: number };

const DEPTH_EPSILON = 1e-5;
const FLOOR_TILE_DEPTH_BIAS = 1;
const ENTITY_DEPTH_EPSILON = 0.001;
const DEFAULT_MAX_TERRAIN_ELEVATION = 6;
const DEFAULT_SOUTH_CULLING_PADDING = 5;

const parseHexColor = (hex: string): Rgb => {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    throw new Error(`Expected 6-char hex color, got '${hex}'`);
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const clampChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const rgbToHex = ({ r, g, b }: Rgb): string => {
  const toHex = (channel: number): string => clampChannel(channel).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

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

const getLightingBlend = (lighting: TileLighting): number => {
  switch (lighting) {
    case "sun":
      return 0.72;
    case "dark":
      return 0.9;
    case "neutral":
      return 0;
  }
};

const getLightingOverlayAlpha = (lighting: TileLighting): number => {
  switch (lighting) {
    case "sun":
      return 0.34;
    case "dark":
      return 0.62;
    case "neutral":
      return 0;
  }
};

const getLightingOverlayColor = (lighting: TileLighting): string => {
  switch (lighting) {
    case "sun":
      return "#f0b36a";
    case "dark":
      return "#11233f";
    case "neutral":
      return "#000000";
  }
};

export class TilemapRenderComponent extends RenderComponent {
  private readonly runtime: EcsRuntime;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  private renderNodeQuery: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly terminator: TerminatorModel,
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
    const elevationPixels = camera.getElevationStepPixels();
    const maxTerrainElevation = this.options?.maxTerrainElevation ?? DEFAULT_MAX_TERRAIN_ELEVATION;
    const southCullingPadding = this.options?.southCullingPadding ?? DEFAULT_SOUTH_CULLING_PADDING;
    const verticalPadding = Math.ceil((maxTerrainElevation * elevationPixels) / this.tileHeight) + 2;

    const minX = Math.floor(center.x) - radiusX;
    const maxX = Math.floor(center.x) + radiusX;
    const minY = Math.floor(center.y) - radiusY - verticalPadding;
    const maxY = Math.floor(center.y) + radiusY + verticalPadding + southCullingPadding;

    const tileCommands: TileCommand[] = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const world = new Vector2D(x, y);
        const tile = this.map.getTile(x, y);
        const distance = this.terminator.distanceOutsideSafeBand(world);
        const lighting: TileLighting = distance <= 0
          ? "neutral"
          : this.terminator.getSide(world) === "sun"
            ? "sun"
            : "dark";

        const tileDepth = x + y + tile.elevation;
        const drawDepth = tile.occluder ? tileDepth : tileDepth - FLOOR_TILE_DEPTH_BIAS;

        tileCommands.push({
          depth: drawDepth,
          tile,
          lighting,
          sprite: this.atlas.variants[tile.kind][tile.surfaceVariant],
          x,
          y,
          screen: camera.toCanvasAt(world, tile.elevation, canvasSize),
        });
      }
    }

    tileCommands.sort((a, b) => {
      const depthDelta = a.depth - b.depth;
      if (Math.abs(depthDelta) > DEPTH_EPSILON) {
        return depthDelta;
      }

      const screenYDelta = a.screen.y - b.screen.y;
      if (Math.abs(screenYDelta) > DEPTH_EPSILON) {
        return screenYDelta;
      }

      return 0;
    });

    for (const command of tileCommands) {
      this.drawTopFace(ctx, command, camera, canvasSize);
    }

    const overlayCommands = this.collectOverlayCommands(
      tileCommands,
      minX,
      maxX,
      minY,
      maxY,
      camera,
      canvasSize,
    );

    overlayCommands.sort((a, b) => {
      const depthDelta = a.depth - b.depth;
      if (Math.abs(depthDelta) > DEPTH_EPSILON) {
        return depthDelta;
      }

      const screenYDelta = a.screen.y - b.screen.y;
      if (Math.abs(screenYDelta) > DEPTH_EPSILON) {
        return screenYDelta;
      }

      if (a.kind !== b.kind) {
        return a.kind === "entity" ? -1 : 1;
      }

      return 0;
    });

    for (const command of overlayCommands) {
      if (command.kind === "entity") {
        command.renderable.renderIsometric(ctx, command.screen, command.selected);
      } else if (command.kind === "east-face") {
        this.drawEastFace(ctx, command, camera, canvasSize);
      } else {
        this.drawSouthFace(ctx, command, camera, canvasSize);
      }
    }

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

  private collectOverlayCommands(
    tileCommands: readonly TileCommand[],
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
  ): OverlayCommand[] {
    const commands: OverlayCommand[] = [];

    for (const tile of tileCommands) {
      if (this.hasEastFace(tile)) {
        commands.push({
          kind: "east-face",
          depth: tile.depth + 0.2,
          tile: tile.tile,
          lighting: tile.lighting,
          sprite: tile.sprite,
          x: tile.x,
          y: tile.y,
          screen: tile.screen,
        });
      }

      if (this.hasSouthFace(tile)) {
        commands.push({
          kind: "south-face",
          depth: tile.depth + 0.3,
          tile: tile.tile,
          lighting: tile.lighting,
          sprite: tile.sprite,
          x: tile.x,
          y: tile.y,
          screen: tile.screen,
        });
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

      const screen = camera.toCanvasAt(new Vector2D(position.x, position.y), position.z, canvasSize);
      const selected = this.options?.isSelectedAt?.(position.x, position.y, position.z) ?? false;

      for (const renderable of renderables) {
        commands.push({
          kind: "entity",
          depth: position.x + position.y + position.z + renderable.sortOffset + ENTITY_DEPTH_EPSILON,
          screen,
          renderable,
          selected,
        });
      }
    }

    return commands;
  }

  private hasEastFace(command: TileCommand): boolean {
    const neighbor = this.map.getTile(command.x + 1, command.y);
    return Math.max(
      0,
      command.tile.corners.northEast - neighbor.corners.northWest,
      command.tile.corners.southEast - neighbor.corners.southWest,
    ) > 0;
  }

  private hasSouthFace(command: TileCommand): boolean {
    const neighbor = this.map.getTile(command.x, command.y + 1);
    return Math.max(
      0,
      command.tile.corners.southWest - neighbor.corners.northWest,
      command.tile.corners.southEast - neighbor.corners.northEast,
    ) > 0;
  }

  private drawTopFace(
    ctx: CanvasRenderingContext2D,
    command: TileCommand,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
  ): void {
    const corners = this.getCornerPoints(command, camera, canvasSize);
    const palette = this.atlas.palettes[command.tile.kind];
    const baseColor = palette[command.tile.surfaceVariant];
    const litColor = command.lighting === "neutral"
      ? baseColor
      : blendColor(baseColor, getLightingOverlayColor(command.lighting), getLightingBlend(command.lighting));
    const overlayAlpha = getLightingOverlayAlpha(command.lighting);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners.northWest.x, corners.northWest.y);
    ctx.lineTo(corners.northEast.x, corners.northEast.y);
    ctx.lineTo(corners.southEast.x, corners.southEast.y);
    ctx.lineTo(corners.southWest.x, corners.southWest.y);
    ctx.closePath();

    if (isTileFlat(command.tile)) {
      ctx.clip();
      const left = Math.floor(command.screen.x - command.sprite.width / 2);
      const top = Math.floor(
        command.screen.y -
          this.tileHeight / 2 -
          (command.sprite.height - this.tileHeight),
      );
      ctx.drawImage(command.sprite, left, top);
      if (command.lighting !== "neutral") {
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = getLightingOverlayColor(command.lighting);
        ctx.globalAlpha = overlayAlpha;
        ctx.fillRect(left, top, command.sprite.width, command.sprite.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    } else {
      ctx.fillStyle = litColor;
      ctx.fill();
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.stroke();
    ctx.restore();
  }

  private drawEastFace(
    ctx: CanvasRenderingContext2D,
    command: FaceCommand,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
  ): void {
    const tileCorners = this.getCornerPoints(command, camera, canvasSize);
    const neighbor = this.map.getTile(command.x + 1, command.y);
    const neighborCorners = this.getCornerPointsForTile(command.x + 1, command.y, neighbor, camera, canvasSize);
    const drop = Math.max(
      0,
      command.tile.corners.northEast - neighbor.corners.northWest,
      command.tile.corners.southEast - neighbor.corners.southWest,
    );

    if (drop <= 0) {
      return;
    }

    ctx.save();
    const palette = this.atlas.palettes[command.tile.kind];
    const baseFaceColor = blendColor(palette[command.tile.surfaceVariant], "#000000", 0.38);
    const litFaceColor = command.lighting === "neutral"
      ? baseFaceColor
      : blendColor(baseFaceColor, getLightingOverlayColor(command.lighting), getLightingBlend(command.lighting));
    ctx.fillStyle = litFaceColor;
    ctx.beginPath();
    ctx.moveTo(tileCorners.northEast.x, tileCorners.northEast.y);
    ctx.lineTo(tileCorners.southEast.x, tileCorners.southEast.y);
    ctx.lineTo(neighborCorners.southWest.x, neighborCorners.southWest.y);
    ctx.lineTo(neighborCorners.northWest.x, neighborCorners.northWest.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawSouthFace(
    ctx: CanvasRenderingContext2D,
    command: FaceCommand,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
  ): void {
    const tileCorners = this.getCornerPoints(command, camera, canvasSize);
    const neighbor = this.map.getTile(command.x, command.y + 1);
    const neighborCorners = this.getCornerPointsForTile(command.x, command.y + 1, neighbor, camera, canvasSize);
    const drop = Math.max(
      0,
      command.tile.corners.southWest - neighbor.corners.northWest,
      command.tile.corners.southEast - neighbor.corners.northEast,
    );

    if (drop <= 0) {
      return;
    }

    ctx.save();
    const palette = this.atlas.palettes[command.tile.kind];
    const baseFaceColor = blendColor(palette[command.tile.surfaceVariant], "#000000", 0.5);
    const litFaceColor = command.lighting === "neutral"
      ? baseFaceColor
      : blendColor(baseFaceColor, getLightingOverlayColor(command.lighting), getLightingBlend(command.lighting));
    ctx.fillStyle = litFaceColor;
    ctx.beginPath();
    ctx.moveTo(tileCorners.southWest.x, tileCorners.southWest.y);
    ctx.lineTo(tileCorners.southEast.x, tileCorners.southEast.y);
    ctx.lineTo(neighborCorners.northEast.x, neighborCorners.northEast.y);
    ctx.lineTo(neighborCorners.northWest.x, neighborCorners.northWest.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private getCornerPoints(
    command: TileCommand,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
  ): TileCornerPoints {
    return this.getCornerPointsForTile(command.x, command.y, command.tile, camera, canvasSize);
  }

  private getCornerPointsForTile(
    x: number,
    y: number,
    tile: TileData,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
  ): TileCornerPoints {
    return {
      northWest: camera.toCanvasAt(new Vector2D(x - 0.5, y - 0.5), tile.corners.northWest, canvasSize),
      northEast: camera.toCanvasAt(new Vector2D(x + 0.5, y - 0.5), tile.corners.northEast, canvasSize),
      southEast: camera.toCanvasAt(new Vector2D(x + 0.5, y + 0.5), tile.corners.southEast, canvasSize),
      southWest: camera.toCanvasAt(new Vector2D(x - 0.5, y + 0.5), tile.corners.southWest, canvasSize),
    };
  }
}
