import { TransformComponent, Vector2D, type Entity } from "@claudiu-ceia/tick";
import {
  RaycastEmitterComponent,
  type RaycastHit,
  type RaycastPoint,
  type RaycastResult,
} from "../components/RaycastEmitterComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { HitColliderEntity } from "../entities/HitColliderEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

const RAY_STEP = 0.15;
const HIT_EPSILON = 0.02;
const COLLIDER_BOUNDS_PADDING = 0.05;
const MIN_DIRECTION_MAGNITUDE = 0.0001;

export type RaycastableEntity = Entity & {
  getComponent(constr: typeof TransformComponent): TransformComponent;
  getComponent(constr: typeof RaycastEmitterComponent): RaycastEmitterComponent;
};

export type PreparedHitCollider = {
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

export const toRaycastPoint = (point: Vector2D, z: number): RaycastPoint => ({
  x: point.x,
  y: point.y,
  z,
});

export const getHorizontalRayDirections = (
  rotation: number,
  fovRadians: number,
  rayCount: number,
): Vector2D[] => {
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

export const prepareHitColliders = (
  map: InfiniteTilemap,
  hitColliders: readonly HitColliderEntity[],
): PreparedHitCollider[] => {
  const prepared: PreparedHitCollider[] = [];

  for (const collider of hitColliders) {
    const owner = collider.parent;
    if (!owner) {
      continue;
    }

    const bounds = collider.bbox();
    const baseElevation = owner.hasComponent(TilePositionComponent)
      ? owner.getComponent(TilePositionComponent).z
      : map.getElevationAt(
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
};

export const collectPreparedHitColliders = (
  runtime: Entity["runtime"],
  map: InfiniteTilemap,
): PreparedHitCollider[] =>
  prepareHitColliders(
    map,
    runtime.registry
      .getAllEntities()
      .filter((entity): entity is HitColliderEntity => entity instanceof HitColliderEntity),
  );

export const castRaySegment = (
  map: InfiniteTilemap,
  sourceEntity: Entity,
  origin: RaycastPoint,
  end: RaycastPoint,
  hitColliders: readonly PreparedHitCollider[],
): RaycastResult => {
  const originXY = new Vector2D(origin.x, origin.y);
  const endXY = new Vector2D(end.x, end.y);
  const deltaXY = endXY.subtract(originXY);
  const horizontalDistance = deltaXY.magnitude;
  const direction =
    horizontalDistance > MIN_DIRECTION_MAGNITUDE ? deltaXY.normalize() : new Vector2D(1, 0);
  let hit: RaycastHit | null = null;
  let endPoint = { ...end };
  const candidateColliders = getCandidateColliders(sourceEntity, origin, end, hitColliders);

  if (horizontalDistance <= MIN_DIRECTION_MAGNITUDE) {
    return {
      origin,
      direction,
      endPoint,
      distance: 0,
      hit,
    };
  }

  for (let distance = RAY_STEP; distance <= horizontalDistance; distance += RAY_STEP) {
    const ratio = distance / horizontalDistance;
    const samplePoint = originXY.add(direction.multiply(distance));
    const sampleZ = origin.z + (end.z - origin.z) * ratio;
    const colliderHit = findColliderHit(samplePoint, sampleZ, distance, candidateColliders);
    if (colliderHit) {
      endPoint = colliderHit.point;
      hit = colliderHit;
      break;
    }

    const terrainElevation = map.getElevationAt(samplePoint.x, samplePoint.y);
    if (terrainElevation + HIT_EPSILON >= sampleZ) {
      hit = {
        type: "terrain",
        point: toRaycastPoint(samplePoint, sampleZ),
        distance,
        collider: null,
        entity: null,
      };
      endPoint = hit.point;
      break;
    }
  }

  return {
    origin,
    direction,
    endPoint,
    distance: hit?.distance ?? horizontalDistance,
    hit,
  };
};

const getCandidateColliders = (
  sourceEntity: Entity,
  origin: RaycastPoint,
  end: RaycastPoint,
  hitColliders: readonly PreparedHitCollider[],
): PreparedHitCollider[] => {
  const minX = Math.min(origin.x, end.x) - COLLIDER_BOUNDS_PADDING;
  const maxX = Math.max(origin.x, end.x) + COLLIDER_BOUNDS_PADDING;
  const minY = Math.min(origin.y, end.y) - COLLIDER_BOUNDS_PADDING;
  const maxY = Math.max(origin.y, end.y) + COLLIDER_BOUNDS_PADDING;
  const minZ = Math.min(origin.z, end.z) - HIT_EPSILON;
  const maxZ = Math.max(origin.z, end.z) + HIT_EPSILON;

  return hitColliders.filter((collider) => {
    if (collider.ownerId === sourceEntity.id || collider.ownerParentId === sourceEntity.id) {
      return false;
    }

    if (maxZ < collider.baseElevation || minZ > collider.topElevation) {
      return false;
    }

    return !(
      collider.maxX < minX ||
      collider.minX > maxX ||
      collider.maxY < minY ||
      collider.minY > maxY
    );
  });
};

const findColliderHit = (
  samplePoint: Vector2D,
  sampleZ: number,
  distance: number,
  hitColliders: readonly PreparedHitCollider[],
): RaycastHit | null => {
  for (const collider of hitColliders) {
    if (
      samplePoint.x < collider.minX ||
      samplePoint.x > collider.maxX ||
      samplePoint.y < collider.minY ||
      samplePoint.y > collider.maxY
    ) {
      continue;
    }

    if (sampleZ < collider.baseElevation || sampleZ > collider.topElevation) {
      continue;
    }

    if (!collider.collider.containsPoint(samplePoint)) {
      continue;
    }

    return {
      type: "collider",
      point: toRaycastPoint(samplePoint, sampleZ),
      distance,
      collider: collider.collider,
      entity: collider.owner,
    };
  }

  return null;
};
