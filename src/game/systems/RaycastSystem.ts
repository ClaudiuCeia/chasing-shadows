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

const RAY_STEP = 0.15;
const HIT_EPSILON = 0.02;
const COLLIDER_BOUNDS_PADDING = 0.05;

type RaycastableEntity = Entity & {
  getComponent(constr: typeof TransformComponent): TransformComponent;
  getComponent(constr: typeof RaycastEmitterComponent): RaycastEmitterComponent;
};

type PreparedHitCollider = {
  collider: HitColliderEntity;
  owner: Entity;
  ownerId: string;
  ownerParentId: string | null;
  baseElevation: number;
  topElevation: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
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

    const hitColliders = this.prepareHitColliders(this.runtime.registry
      .getAllEntities()
      .filter((e): e is HitColliderEntity => e instanceof HitColliderEntity));
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

  private prepareHitColliders(hitColliders: readonly HitColliderEntity[]): PreparedHitCollider[] {
    const prepared: PreparedHitCollider[] = [];

    for (const collider of hitColliders) {
      const owner = collider.parent;
      if (!owner) {
        continue;
      }

      const bounds = collider.bbox();
      const baseElevation = owner.hasComponent(TilePositionComponent)
        ? owner.getComponent(TilePositionComponent).z
        : this.map.getElevationAt(
            owner.getComponent(TransformComponent).transform.position.x,
            owner.getComponent(TransformComponent).transform.position.y,
          );

      prepared.push({
        collider,
        owner,
        ownerId: owner.id,
        ownerParentId: owner.parent?.id ?? null,
        baseElevation,
        topElevation: baseElevation + collider.bodyHeight,
        minX: bounds.x,
        maxX: bounds.x + bounds.width,
        minY: bounds.y,
        maxY: bounds.y + bounds.height,
      });
    }

    return prepared;
  }

  private castRay(
    sourceEntity: Entity,
    originXY: Vector2D,
    originZ: number,
    direction: Vector2D,
    maxDistance: number,
    hitColliders: readonly PreparedHitCollider[],
  ): RaycastResult {
    let endPoint = originXY.add(direction.multiply(maxDistance));
    let hit: RaycastHit | null = null;
    const candidateColliders = this.getCandidateColliders(sourceEntity, originXY, endPoint, originZ, hitColliders);

    for (let distance = RAY_STEP; distance <= maxDistance; distance += RAY_STEP) {
      const samplePoint = originXY.add(direction.multiply(distance));
      const colliderHit = this.findColliderHit(samplePoint, originZ, distance, candidateColliders);
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

  private getCandidateColliders(
    sourceEntity: Entity,
    originXY: Vector2D,
    endPoint: Vector2D,
    originZ: number,
    hitColliders: readonly PreparedHitCollider[],
  ): PreparedHitCollider[] {
    const minX = Math.min(originXY.x, endPoint.x) - COLLIDER_BOUNDS_PADDING;
    const maxX = Math.max(originXY.x, endPoint.x) + COLLIDER_BOUNDS_PADDING;
    const minY = Math.min(originXY.y, endPoint.y) - COLLIDER_BOUNDS_PADDING;
    const maxY = Math.max(originXY.y, endPoint.y) + COLLIDER_BOUNDS_PADDING;

    return hitColliders.filter((collider) => {
      if (collider.ownerId === sourceEntity.id || collider.ownerParentId === sourceEntity.id) {
        return false;
      }

      if (originZ < collider.baseElevation || originZ > collider.topElevation) {
        return false;
      }

      return !(
        collider.maxX < minX ||
        collider.minX > maxX ||
        collider.maxY < minY ||
        collider.minY > maxY
      );
    });
  }

  private findColliderHit(
    samplePoint: Vector2D,
    originZ: number,
    distance: number,
    hitColliders: readonly PreparedHitCollider[],
  ): RaycastHit | null {
    for (const collider of hitColliders) {
      if (samplePoint.x < collider.minX || samplePoint.x > collider.maxX || samplePoint.y < collider.minY || samplePoint.y > collider.maxY) {
        continue;
      }

      if (originZ < collider.baseElevation || originZ > collider.topElevation) {
        continue;
      }

      if (!collider.collider.containsPoint(samplePoint)) {
        continue;
      }

      return {
        type: "collider",
        point: toPoint(samplePoint, originZ),
        distance,
        collider: collider.collider,
        entity: collider.owner,
      };
    }

    return null;
  }
}
