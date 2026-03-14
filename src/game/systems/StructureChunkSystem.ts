import {
  EcsRuntime,
  RectangleCollisionShape,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type Entity,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { StructureStateComponent } from "../components/StructureStateComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { ObstacleEntity } from "../entities/ObstacleEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { StructureHitVolumeEntity } from "../entities/StructureHitVolumeEntity.ts";
import { StructureVisualEntity } from "../entities/StructureVisualEntity.ts";
import {
  STRUCTURE_DOOR_LEVELS,
  StructureFloorRenderComponent,
  STRUCTURE_LEVEL_HEIGHT_WORLD,
  STRUCTURE_ROOF_THICKNESS_WORLD,
  StructureRoofRenderComponent,
  STRUCTURE_WALL_LEVELS,
  STRUCTURE_WALL_HEIGHT_WORLD,
  StructureWallRenderComponent,
  STRUCTURE_WINDOW_BASE_LEVEL,
  STRUCTURE_WINDOW_LEVELS,
} from "../render/StructurePartRenderComponent.ts";
import { getStructureBlueprintById } from "../structures/structure-blueprints.ts";
import {
  getStructureBounds,
  getStructureFloorTiles,
  getStructureRoofTiles,
  getStructureWalls,
  isPointInsideStructure,
} from "../structures/structure-geometry.ts";
import type { StructureInstance, StructureWallSegment } from "../structures/structure-types.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";

type ActiveStructure = {
  instance: StructureInstance;
  entities: Entity[];
  roofParts: StructureRoofRenderComponent[];
};

const WALL_COLLIDER_INSET = 0.18;
const WALL_HIT_VOLUME_DEPTH = 0.24;
const ROOF_INSIDE_OPACITY = 0;
const ROOF_OUTSIDE_OPACITY = 1;

const structureKey = (instance: StructureInstance): string =>
  `${instance.blueprintId}:${instance.originX}:${instance.originY}:${instance.baseZ}:${instance.rotation}`;

const overlapsChunkWindow = (
  map: InfiniteTilemap,
  instance: StructureInstance,
  chunkX: number,
  chunkY: number,
  chunkRadius: number,
): boolean => {
  const blueprint = getStructureBlueprintById(instance.blueprintId);
  const bounds = getStructureBounds(blueprint, instance);
  const chunkSize = map.getChunkSize();
  const minChunkX = Math.floor(bounds.minX / chunkSize);
  const maxChunkX = Math.floor(bounds.maxX / chunkSize);
  const minChunkY = Math.floor(bounds.minY / chunkSize);
  const maxChunkY = Math.floor(bounds.maxY / chunkSize);

  return !(
    maxChunkX < chunkX - chunkRadius ||
    minChunkX > chunkX + chunkRadius ||
    maxChunkY < chunkY - chunkRadius ||
    minChunkY > chunkY + chunkRadius
  );
};

const createWallCollider = (wall: StructureWallSegment): ObstacleEntity | null => {
  if (wall.type === "door") {
    return null;
  }

  switch (wall.side) {
    case "north":
      return new ObstacleEntity({
        position: new Vector2D(wall.anchorX, wall.anchorY + WALL_COLLIDER_INSET / 2),
        shape: new RectangleCollisionShape(1, WALL_COLLIDER_INSET),
        hitHeight: 0,
      });
    case "east":
      return new ObstacleEntity({
        position: new Vector2D(wall.anchorX - WALL_COLLIDER_INSET / 2, wall.anchorY),
        shape: new RectangleCollisionShape(WALL_COLLIDER_INSET, 1),
        hitHeight: 0,
      });
    case "south":
      return new ObstacleEntity({
        position: new Vector2D(wall.anchorX, wall.anchorY - WALL_COLLIDER_INSET / 2),
        shape: new RectangleCollisionShape(1, WALL_COLLIDER_INSET),
        hitHeight: 0,
      });
    case "west":
      return new ObstacleEntity({
        position: new Vector2D(wall.anchorX + WALL_COLLIDER_INSET / 2, wall.anchorY),
        shape: new RectangleCollisionShape(WALL_COLLIDER_INSET, 1),
        hitHeight: 0,
      });
  }
};

const createWallHitVolumes = (wall: StructureWallSegment, baseZ: number): StructureHitVolumeEntity[] => {
  const horizontal = wall.side === "north" || wall.side === "south";
  const w = horizontal ? 1 : WALL_HIT_VOLUME_DEPTH;
  const h = horizontal ? WALL_HIT_VOLUME_DEPTH : 1;

  const makeVolume = (levelStart: number, levelCount: number): StructureHitVolumeEntity =>
    new StructureHitVolumeEntity({
      x: wall.anchorX,
      y: wall.anchorY,
      z: baseZ + levelStart * STRUCTURE_LEVEL_HEIGHT_WORLD,
      width: w,
      height: h,
      bodyHeight: levelCount * STRUCTURE_LEVEL_HEIGHT_WORLD,
    });

  switch (wall.type) {
    case "solid":
      return [makeVolume(0, STRUCTURE_WALL_LEVELS)];
    case "window":
      return [
        makeVolume(0, STRUCTURE_WINDOW_BASE_LEVEL),
        makeVolume(
          STRUCTURE_WINDOW_BASE_LEVEL + STRUCTURE_WINDOW_LEVELS,
          STRUCTURE_WALL_LEVELS - STRUCTURE_WINDOW_BASE_LEVEL - STRUCTURE_WINDOW_LEVELS,
        ),
      ];
    case "door":
      return [makeVolume(STRUCTURE_DOOR_LEVELS, STRUCTURE_WALL_LEVELS - STRUCTURE_DOOR_LEVELS)];
  }
};

const createRoofHitVolume = (x: number, y: number, baseZ: number): StructureHitVolumeEntity =>
  new StructureHitVolumeEntity({
    x,
    y,
    z: baseZ + STRUCTURE_WALL_HEIGHT_WORLD,
    width: 1,
    height: 1,
    bodyHeight: STRUCTURE_ROOF_THICKNESS_WORLD,
  });

const createWallVisuals = (wall: StructureWallSegment, baseZ: number): StructureVisualEntity[] => {
  if (wall.type === "door") {
    return [
      new StructureVisualEntity(
        wall.anchorX,
        wall.anchorY,
        baseZ,
        new StructureWallRenderComponent(wall.side, STRUCTURE_DOOR_LEVELS, STRUCTURE_WALL_LEVELS - STRUCTURE_DOOR_LEVELS),
      ),
    ];
  }

  if (wall.type === "window") {
    return [
      new StructureVisualEntity(
        wall.anchorX,
        wall.anchorY,
        baseZ,
        new StructureWallRenderComponent(wall.side, 0, STRUCTURE_WINDOW_BASE_LEVEL),
      ),
      new StructureVisualEntity(
        wall.anchorX,
        wall.anchorY,
        baseZ,
        new StructureWallRenderComponent(
          wall.side,
          STRUCTURE_WINDOW_BASE_LEVEL + STRUCTURE_WINDOW_LEVELS,
          STRUCTURE_WALL_LEVELS - STRUCTURE_WINDOW_BASE_LEVEL - STRUCTURE_WINDOW_LEVELS,
        ),
      ),
    ];
  }

  return [
    new StructureVisualEntity(
      wall.anchorX,
      wall.anchorY,
      baseZ,
      new StructureWallRenderComponent(wall.side, 0, STRUCTURE_WALL_LEVELS),
    ),
  ];
};

export class StructureChunkSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly active = new Map<string, ActiveStructure>();
  private readonly runtime: EcsRuntime;
  private worldQuery: EntityQuery | null = null;
  private initialized = false;
  private lastChunkX = 0;
  private lastChunkY = 0;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    private readonly chunkRadius: number,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.worldQuery = this.runtime.registry.query().with(StructureStateComponent);
  }

  public update(): void {
    const structures = this.worldQuery ? getSingletonComponent(this.worldQuery, StructureStateComponent) : null;
    if (!structures) {
      return;
    }

    const chunkSize = this.map.getChunkSize();
    const position = this.player.getComponent(TransformComponent).transform.position;
    const chunkX = Math.floor(position.x / chunkSize);
    const chunkY = Math.floor(position.y / chunkSize);

    // Structures are intentionally static after world creation/load, so the active window only needs to refresh
    // when the player crosses chunk boundaries.
    if (!this.initialized || chunkX !== this.lastChunkX || chunkY !== this.lastChunkY) {
      this.initialized = true;
      this.lastChunkX = chunkX;
      this.lastChunkY = chunkY;
      this.refreshActiveWindow(chunkX, chunkY, structures.getInstances());
    }

    const playerTile = this.player.getComponent(TilePositionComponent);
    for (const active of this.active.values()) {
      const blueprint = getStructureBlueprintById(active.instance.blueprintId);
      const inside = isPointInsideStructure(
        blueprint,
        active.instance,
        position.x,
        position.y,
        playerTile.z,
      );
      const roofOpacity = inside ? ROOF_INSIDE_OPACITY : ROOF_OUTSIDE_OPACITY;
      for (const roofPart of active.roofParts) {
        roofPart.setOpacity(roofOpacity);
      }
    }
  }

  public destroy(): void {
    for (const active of this.active.values()) {
      for (const entity of active.entities) {
        entity.destroy();
      }
    }
    this.active.clear();
  }

  private refreshActiveWindow(chunkX: number, chunkY: number, instances: readonly StructureInstance[]): void {
    const desired = new Set<string>();

    for (const instance of instances) {
      if (!overlapsChunkWindow(this.map, instance, chunkX, chunkY, this.chunkRadius)) {
        continue;
      }

      const key = structureKey(instance);
      desired.add(key);
      if (this.active.has(key)) {
        continue;
      }

      this.active.set(key, this.spawnStructure(instance));
    }

    for (const [key, active] of this.active.entries()) {
      if (desired.has(key)) {
        continue;
      }

      for (const entity of active.entities) {
        entity.destroy();
      }
      this.active.delete(key);
    }
  }

  private spawnStructure(instance: StructureInstance): ActiveStructure {
    const blueprint = getStructureBlueprintById(instance.blueprintId);
    const entities: Entity[] = [];
    const roofParts: StructureRoofRenderComponent[] = [];

    for (const tile of getStructureFloorTiles(blueprint, instance)) {
      const floor = new StructureVisualEntity(tile.x, tile.y, instance.baseZ, new StructureFloorRenderComponent());
      floor.awake();
      entities.push(floor);
    }

    for (const tile of getStructureFloorTiles(blueprint, instance)) {
      this.map.getChunk(Math.floor(tile.x / this.map.getChunkSize()), Math.floor(tile.y / this.map.getChunkSize()));
    }

    for (const tile of getStructureRoofTiles(blueprint, instance)) {
      const roofRenderable = new StructureRoofRenderComponent();
      const roof = new StructureVisualEntity(tile.x, tile.y, instance.baseZ, roofRenderable);
      const roofHitVolume = createRoofHitVolume(tile.x, tile.y, instance.baseZ);
      roof.awake();
      roofHitVolume.awake();
      roofParts.push(roofRenderable);
      entities.push(roof);
      entities.push(roofHitVolume);
    }

    for (const wall of getStructureWalls(blueprint, instance)) {
      for (const visual of createWallVisuals(wall, instance.baseZ)) {
        visual.awake();
        entities.push(visual);
      }

      for (const hitVolume of createWallHitVolumes(wall, instance.baseZ)) {
        hitVolume.awake();
        entities.push(hitVolume);
      }

      const collider = createWallCollider(wall);
      if (collider) {
        collider.awake();
        entities.push(collider);
      }
    }

    return { instance, entities, roofParts };
  }
}
