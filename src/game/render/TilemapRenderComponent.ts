import { EcsRuntime, RenderComponent, RenderLayer, Vector2D, type EntityQuery, type ICamera } from "@claudiu-ceia/tick";
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
  fade: boolean;
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
    const playerElevation = this.map.getTile(playerPosition.x, playerPosition.y).elevation;
    const playerDepth = playerPosition.x + playerPosition.y + playerElevation;

    const radiusX = Math.ceil(canvasSize.x / this.tileWidth) + 8;
    const radiusY = Math.ceil(canvasSize.y / this.tileHeight) + 8;

    const minX = Math.floor(center.x) - radiusX;
    const maxX = Math.floor(center.x) + radiusX;
    const minY = Math.floor(center.y) - radiusY;
    const maxY = Math.floor(center.y) + radiusY;

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
        const drawDepth = tile.occluder ? tileDepth : tileDepth - FLOOR_TILE_DEPTH_BIAS;
        const fade = this.shouldFadeOccluder(tile, x, y, tileDepth, playerPosition, playerDepth);

        commands.push({
          kind: "tile",
          depth: drawDepth,
          tile,
          screen: camera.toCanvas(world, canvasSize),
          sprite,
          x,
          y,
          fade,
        });
      }
    }

    for (const renderable of this.collectRenderableCommands(minX, maxX, minY, maxY, camera, canvasSize)) {
      commands.push(renderable);
    }

    commands.sort((a, b) => {
      const depthDelta = a.depth - b.depth;
      if (Math.abs(depthDelta) > DEPTH_EPSILON) {
        return depthDelta;
      }

      if (a.kind !== b.kind) {
        return a.kind === "tile" ? -1 : 1;
      }

      return 0;
    });

    for (const command of commands) {
      if (command.kind === "tile") {
        const left = Math.floor(command.screen.x - command.sprite.width / 2);
        const top = Math.floor(
          command.screen.y - this.tileHeight / 2 - (command.sprite.height - this.tileHeight),
        );

        if (command.fade) {
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.drawImage(command.sprite, left, top);
          ctx.restore();
        } else {
          ctx.drawImage(command.sprite, left, top);
        }
      } else {
        command.renderable.renderIsometric(ctx, command.screen, command.selected);
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

      const screen = camera.toCanvas(new Vector2D(position.x, position.y), canvasSize);
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

  private shouldFadeOccluder(
    tile: TileData,
    tileX: number,
    tileY: number,
    tileDepth: number,
    playerPosition: Vector2D,
    playerDepth: number,
  ): boolean {
    if (!tile.occluder || tileDepth <= playerDepth) {
      return false;
    }

    const dx = tileX - playerPosition.x;
    const dy = tileY - playerPosition.y;
    return Math.abs(dx) <= 1.25 && Math.abs(dy) <= 1.25;
  }
}
