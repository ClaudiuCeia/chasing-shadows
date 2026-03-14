import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type Entity,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { RaycastEmitterComponent, type RaycastHit, type RaycastPoint, type RaycastResult } from "../components/RaycastEmitterComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { HitColliderEntity } from "../entities/HitColliderEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

const RAY_STEP = 0.1;
const HIT_EPSILON = 0.02;

type RaycastableEntity = Entity & {
  getComponent(constr: typeof TransformComponent): TransformComponent;
  getComponent(constr: typeof RaycastEmitterComponent): RaycastEmitterComponent;
};

const toPoint = (point: Vector2D, z: number): RaycastPoint => ({ x: point.x, y: point.y, z });

const getRayDirections = (rotation: number, fovRadians: number, rayCount: number): Vector2D[] => {
  if (rayCount <= 1 || fovRadians <= 0.0001) {
    return [new Vector2D(Math.cos(rotation), Math.sin(rotation)).normalize()];
  }

  const rays: Vector2D[] = [];
  const start = -fovRadians / 2;
  const step = fovRadians / (rayCount - 1);
  for (let i = 0; i < rayCount; i++) {
    const angle = rotation + start + step * i;
    rays.push(new Vector2D(Math.cos(angle), Math.sin(angle)).normalize());
  }
  return rays;
};

export class RaycastSystem implements System {
  public readonly phase = SystemPhase.Render;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(TransformComponent).with(RaycastEmitterComponent);
  }

  public update(): void {
    if (!this.query) {
      return;
    }

    // TODO: Switch back to a cached type query once tick fixes inherited-type caching for `getEntitiesByType()`.
    const hitColliders = this.runtime.registry
      .getAllEntities()
      .filter((e): e is HitColliderEntity => e instanceof HitColliderEntity);
    for (const entity of this.query.run() as RaycastableEntity[]) {
      const emitter = entity.getComponent(RaycastEmitterComponent);
      if (!emitter.enabled) {
        emitter.clearRays();
        continue;
      }

      const transform = entity.getComponent(TransformComponent).transform;
      const originXY = transform.position;
      const baseElevation = this.map.getElevationAt(originXY.x, originXY.y);
      const originZ = baseElevation + emitter.originHeight;
      const directions = getRayDirections(transform.rotation, emitter.fovRadians, emitter.rayCount);
      const rays = directions.map((direction) =>
        this.castRay(entity, originXY, originZ, direction, emitter.maxDistance, hitColliders),
      );
      emitter.setRays(rays);
    }
  }

  private castRay(
    sourceEntity: Entity,
    originXY: Vector2D,
    originZ: number,
    direction: Vector2D,
    maxDistance: number,
    hitColliders: readonly HitColliderEntity[],
  ): RaycastResult {
    let endPoint = originXY.add(direction.multiply(maxDistance));
    let hit: RaycastHit | null = null;

    for (let distance = RAY_STEP; distance <= maxDistance; distance += RAY_STEP) {
      const samplePoint = originXY.add(direction.multiply(distance));
      const colliderHit = this.findColliderHit(sourceEntity, samplePoint, originZ, distance, hitColliders);
      if (colliderHit) {
        endPoint = samplePoint;
        hit = colliderHit;
        break;
      }

      const terrainElevation = this.map.getElevationAt(samplePoint.x, samplePoint.y);
      if (terrainElevation + HIT_EPSILON >= originZ) {
        endPoint = samplePoint;
        hit = {
          type: "terrain",
          point: toPoint(samplePoint, originZ),
          distance,
          collider: null,
          entity: null,
        };
        break;
      }
    }

    const distance = hit?.distance ?? maxDistance;
    return {
      origin: toPoint(originXY, originZ),
      direction,
      endPoint: toPoint(endPoint, originZ),
      distance,
      hit,
    };
  }

  private findColliderHit(
    sourceEntity: Entity,
    samplePoint: Vector2D,
    originZ: number,
    distance: number,
    hitColliders: readonly HitColliderEntity[],
  ): RaycastHit | null {
    for (const collider of hitColliders) {
      const owner = collider.parent;
      if (!owner || owner.id === sourceEntity.id || owner.parent?.id === sourceEntity.id) {
        continue;
      }

      const baseElevation = owner.hasComponent(TilePositionComponent)
        ? owner.getComponent(TilePositionComponent).z
        : this.map.getElevationAt(owner.getComponent(TransformComponent).transform.position.x, owner.getComponent(TransformComponent).transform.position.y);
      const topElevation = baseElevation + collider.bodyHeight;
      if (originZ < baseElevation || originZ > topElevation) {
        continue;
      }

      if (!collider.containsPoint(samplePoint)) {
        continue;
      }

      return {
        type: "collider",
        point: toPoint(samplePoint, originZ),
        distance,
        collider,
        entity: owner,
      };
    }

    return null;
  }
}
