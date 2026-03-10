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
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import type { TerminatorModel } from "../world/TerminatorModel.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import type { TileData } from "../world/tile-types.ts";
import type { TileAtlas } from "./TileAtlas.ts";
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
  kind: "tile";
  depth: number;
  tile: TileData;
  screen: Vector2D;
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
};

type RenderableCommand = {
  kind: "entity";
  depth: number;
  screen: Vector2D;
  renderable: IsometricRenderableComponent;
  selected: boolean;
};

type DrawCommand = TileCommand | RenderableCommand;

const DEPTH_EPSILON = 1e-5;
const FLOOR_TILE_DEPTH_BIAS = 1;
const ENTITY_DEPTH_EPSILON = 0.001;
const DEFAULT_MAX_TERRAIN_ELEVATION = 6;
const DEFAULT_SOUTH_CULLING_PADDING = 5;

export class TilemapRenderComponent extends RenderComponent {
  private readonly runtime: EcsRuntime;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  private renderNodeQuery: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly terminator: TerminatorModel,
    private readonly player: PlayerEntity,
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
    const playerPosition = this.player.transform.transform.position;
    const playerElevation = this.player.tilePosition.z;
    const playerDepth = playerPosition.x + playerPosition.y + playerElevation;

    const radiusX = Math.ceil(canvasSize.x / this.tileWidth) + 8;
    const radiusY = Math.ceil(canvasSize.y / this.tileHeight) + 8;
    const elevationPixels = camera.getElevationStepPixels();
    const maxTerrainElevation =
      this.options?.maxTerrainElevation ?? DEFAULT_MAX_TERRAIN_ELEVATION;
    const southCullingPadding =
      this.options?.southCullingPadding ?? DEFAULT_SOUTH_CULLING_PADDING;
    const verticalPadding =
      Math.ceil((maxTerrainElevation * elevationPixels) / this.tileHeight) + 2;

    const minX = Math.floor(center.x) - radiusX;
    const maxX = Math.floor(center.x) + radiusX;
    const minY = Math.floor(center.y) - radiusY - verticalPadding;
    const maxY =
      Math.floor(center.y) + radiusY + verticalPadding + southCullingPadding;

    const commands: DrawCommand[] = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const world = new Vector2D(x, y);
        const tile = this.map.getTile(x, y);
        const variantSet = this.atlas.variants[tile.kind];
        const distance = this.terminator.distanceOutsideSafeBand(world);
        const isNeutral = distance <= 0;
        const sprite = isNeutral
          ? variantSet.neutral
          : this.terminator.getSide(world) === "sun"
            ? variantSet.sun
            : variantSet.dark;

        const tileDepth = x + y + tile.elevation;
        const drawDepth = tile.occluder
          ? tileDepth
          : tileDepth - FLOOR_TILE_DEPTH_BIAS;

        commands.push({
          kind: "tile",
          depth: drawDepth,
          tile,
          screen: camera.toCanvasAt(world, tile.elevation, canvasSize),
          sprite,
          x,
          y,
        });
      }
    }

    for (const renderable of this.collectRenderableCommands(
      minX,
      maxX,
      minY,
      maxY,
      camera,
      canvasSize,
    )) {
      commands.push(renderable);
    }

    commands.sort((a, b) => {
      const depthDelta = a.depth - b.depth;
      if (Math.abs(depthDelta) > DEPTH_EPSILON) {
        return depthDelta;
      }

      const screenYDelta = a.screen.y - b.screen.y;
      if (Math.abs(screenYDelta) > DEPTH_EPSILON) {
        return screenYDelta;
      }

      if (a.kind !== b.kind) {
        return a.kind === "tile" ? -1 : 1;
      }

      return 0;
    });

    for (const command of commands) {
      if (command.kind === "tile") {
        this.drawCliffFaces(ctx, command, camera);

        const left = Math.floor(command.screen.x - command.sprite.width / 2);
        const top = Math.floor(
          command.screen.y -
            this.tileHeight / 2 -
            (command.sprite.height - this.tileHeight),
        );

        ctx.drawImage(command.sprite, left, top);
        this.drawDropEdgeOutlines(ctx, command);
      } else {
        command.renderable.renderIsometric(
          ctx,
          command.screen,
          command.selected,
        );
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

  private collectRenderableCommands(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
  ): RenderableCommand[] {
    const commands: RenderableCommand[] = [];
    if (!this.renderNodeQuery) {
      return commands;
    }

    for (const entity of this.renderNodeQuery.run() as IsometricRenderableEntity[]) {
      const position = entity.getComponent(TilePositionComponent);
      if (
        position.x < minX ||
        position.x > maxX ||
        position.y < minY ||
        position.y > maxY
      ) {
        continue;
      }

      const renderables = entity.components.filter(
        (component): component is IsometricRenderableComponent =>
          component instanceof IsometricRenderableComponent,
      );
      if (renderables.length === 0) {
        continue;
      }

      const screen = camera.toCanvasAt(
        new Vector2D(position.x, position.y),
        position.z,
        canvasSize,
      );
      const selected =
        this.options?.isSelectedAt?.(position.x, position.y, position.z) ??
        false;

      for (const renderable of renderables) {
        commands.push({
          kind: "entity",
          depth:
            position.x +
            position.y +
            position.z +
            renderable.sortOffset +
            ENTITY_DEPTH_EPSILON,
          screen,
          renderable,
          selected,
        });
      }
    }

    return commands;
  }

  private drawCliffFaces(
    ctx: CanvasRenderingContext2D,
    command: TileCommand,
    camera: IsometricCameraEntity,
  ): void {
    const elevation = command.tile.elevation;
    if (elevation <= 0) {
      return;
    }

    const eastHeight = this.map.getTile(command.x + 1, command.y).elevation;
    const southHeight = this.map.getTile(command.x, command.y + 1).elevation;

    const eastDrop = elevation - eastHeight;
    const southDrop = elevation - southHeight;
    if (eastDrop <= 0 && southDrop <= 0) {
      return;
    }

    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const dropScale = camera.getElevationStepPixels();

    const east = new Vector2D(command.screen.x + hw, command.screen.y);
    const south = new Vector2D(command.screen.x, command.screen.y + hh);
    const west = new Vector2D(command.screen.x - hw, command.screen.y);

    const eastFaceColor = "#3a2a1f";
    const southFaceColor = "#281d14";

    if (eastDrop > 0) {
      this.drawDropFace(ctx, east, south, eastDrop * dropScale, eastFaceColor);
    }

    if (southDrop > 0) {
      this.drawDropFace(
        ctx,
        south,
        west,
        southDrop * dropScale,
        southFaceColor,
      );
    }
  }

  private drawDropFace(
    ctx: CanvasRenderingContext2D,
    a: Vector2D,
    b: Vector2D,
    dropPixels: number,
    fillStyle: string,
  ): void {
    if (dropPixels <= 0.001) {
      return;
    }

    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x, b.y + dropPixels);
    ctx.lineTo(a.x, a.y + dropPixels);
    ctx.closePath();
    ctx.fill();
  }

  private drawDropEdgeOutlines(
    ctx: CanvasRenderingContext2D,
    command: TileCommand,
  ): void {
    const elevation = command.tile.elevation;

    const northHeight = this.map.getTile(command.x - 1, command.y).elevation;
    const westHeight = this.map.getTile(command.x, command.y - 1).elevation;
    const eastHeight = this.map.getTile(command.x + 1, command.y).elevation;
    const southHeight = this.map.getTile(command.x, command.y + 1).elevation;

    const northDrop = northHeight - elevation;
    const westDrop = westHeight - elevation;
    const eastDrop = elevation - eastHeight;
    const southDrop = elevation - southHeight;

    const northDropDown = elevation - northHeight;
    const westDropDown = elevation - westHeight;

    const hasAnyEdge =
      northDrop > 0 ||
      westDrop > 0 ||
      eastDrop > 0 ||
      southDrop > 0 ||
      northDropDown > 0 ||
      westDropDown > 0;
    if (!hasAnyEdge) {
      return;
    }

    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const north = new Vector2D(command.screen.x, command.screen.y - hh);
    const east = new Vector2D(command.screen.x + hw, command.screen.y);
    const south = new Vector2D(command.screen.x, command.screen.y + hh);
    const west = new Vector2D(command.screen.x - hw, command.screen.y);

    const segments: Array<[Vector2D, Vector2D]> = [];

    if (westDropDown > 0) {
      segments.push([north, east]);
    }

    if (northDropDown > 0) {
      segments.push([west, north]);
    }

    if (segments.length === 0) {
      return;
    }

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.strokeStyle = "rgba(21, 14, 9, 0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [start, end] of segments) {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
