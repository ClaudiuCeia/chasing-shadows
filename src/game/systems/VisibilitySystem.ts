import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  type Entity,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { RaycastEmitterComponent } from "../components/RaycastEmitterComponent.ts";
import { StaticWorldObjectComponent } from "../components/StaticWorldObjectComponent.ts";
import { StructureStateComponent } from "../components/StructureStateComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { VisibilityStateComponent, type VisibilityTile } from "../components/VisibilityStateComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { getStructureFloorTiles } from "../structures/structure-geometry.ts";
import { getStructureBlueprintById } from "../structures/structure-blueprints.ts";
import type { StructureInstance } from "../structures/structure-types.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { tileKey } from "../../shared/math/tile-key.ts";
import { GAME_CONFIG } from "../config/game-config.ts";

type StaticObjectEntity = Entity & {
  id: string;
  getComponent(constr: typeof StaticWorldObjectComponent): StaticWorldObjectComponent;
  getComponent(constr: typeof TilePositionComponent): TilePositionComponent;
};

const structureKey = (instance: StructureInstance): string =>
  `${instance.blueprintId}:${instance.originX}:${instance.originY}:${instance.baseZ}:${instance.rotation}`;

const toTileCoordinate = (value: number): number => Math.floor(value + 0.5);

const sampleRayTiles = (
  originX: number,
  originY: number,
  endX: number,
  endY: number,
  distance: number,
  stepSize: number,
): VisibilityTile[] => {
  if (distance <= 0.0001) {
    return [{ x: toTileCoordinate(originX), y: toTileCoordinate(originY) }];
  }

  const tiles = new Map<string, VisibilityTile>();
  const dx = endX - originX;
  const dy = endY - originY;
  const steps = Math.max(1, Math.ceil(distance / stepSize));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = originX + dx * t;
    const y = originY + dy * t;
    const tile = { x: toTileCoordinate(x), y: toTileCoordinate(y) };
    tiles.set(tileKey(tile.x, tile.y), tile);
  }

  return Array.from(tiles.values());
};

export class VisibilitySystem implements System {
  public readonly phase = SystemPhase.Render;
  public readonly tickMode = SystemTickMode.Frame;

  private worldQuery: EntityQuery | null = null;
  private staticObjectQuery: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    private readonly runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {}

  public awake(): void {
    this.worldQuery = this.runtime.registry.query().with(VisibilityStateComponent).with(StructureStateComponent);
    this.staticObjectQuery = this.runtime.registry.query().with(StaticWorldObjectComponent).with(TilePositionComponent);
  }

  public update(): void {
    const visibility = this.worldQuery ? getSingletonComponent(this.worldQuery, VisibilityStateComponent) : null;
    const structures = this.worldQuery ? getSingletonComponent(this.worldQuery, StructureStateComponent) : null;
    if (!visibility || !structures) {
      return;
    }

    const visibleTiles = this.computeVisibleTiles();
    visibility.setVisibleTiles(visibleTiles.values());

    const visibleTileKeys = new Set(visibleTiles.keys());
    visibility.setVisibleStructures(this.computeVisibleStructures(structures.getInstances(), visibleTileKeys));

    const { objectIds, occupiedTiles } = this.computeVisibleStaticObjects(visibleTileKeys);
    visibility.setVisibleStaticObjects(objectIds, occupiedTiles);
  }

  private computeVisibleTiles(): Map<string, VisibilityTile> {
    const emitter = this.player.getComponent(RaycastEmitterComponent);
    const transform = this.player.getComponent(TransformComponent).transform;
    const visibleTiles = new Map<string, VisibilityTile>();
    const originTile = {
      x: toTileCoordinate(transform.position.x),
      y: toTileCoordinate(transform.position.y),
    };
    visibleTiles.set(tileKey(originTile.x, originTile.y), originTile);

    for (const ray of emitter.rays) {
      const sampled = sampleRayTiles(
        ray.origin.x,
        ray.origin.y,
        ray.endPoint.x,
        ray.endPoint.y,
        ray.distance,
        GAME_CONFIG.visibilityTileSampleStep,
      );
      for (const tile of sampled) {
        visibleTiles.set(tileKey(tile.x, tile.y), tile);
      }
    }

    return visibleTiles;
  }

  private computeVisibleStructures(instances: readonly StructureInstance[], visibleTileKeys: ReadonlySet<string>): string[] {
    const visibleStructures: string[] = [];

    for (const instance of instances) {
      const blueprint = getStructureBlueprintById(instance.blueprintId);
      const floorTiles = getStructureFloorTiles(blueprint, instance);
      if (floorTiles.some((tile) => visibleTileKeys.has(tileKey(tile.x, tile.y)))) {
        visibleStructures.push(structureKey(instance));
      }
    }

    return visibleStructures;
  }

  private computeVisibleStaticObjects(visibleTileKeys: ReadonlySet<string>): {
    objectIds: string[];
    occupiedTiles: VisibilityTile[];
  } {
    if (!this.staticObjectQuery) {
      return { objectIds: [], occupiedTiles: [] };
    }

    const objectIds: string[] = [];
    const occupiedTiles = new Map<string, VisibilityTile>();
    for (const entity of this.staticObjectQuery.run() as StaticObjectEntity[]) {
      const tile = entity.getComponent(TilePositionComponent);
      const tileRef = { x: tile.x, y: tile.y };
      if (!visibleTileKeys.has(tileKey(tileRef.x, tileRef.y))) {
        continue;
      }

      objectIds.push(entity.id);
      occupiedTiles.set(tileKey(tileRef.x, tileRef.y), tileRef);
    }

    return { objectIds, occupiedTiles: Array.from(occupiedTiles.values()) };
  }
}