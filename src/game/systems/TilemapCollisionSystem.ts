import {
  EcsRuntime,
  PhysicsBodyComponent,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { clamp } from "../../shared/math/clamp.ts";

type CollisionActorEntity = {
  collisionRadius: number;
  getComponent(constr: typeof TransformComponent): TransformComponent;
  getComponent(constr: typeof PhysicsBodyComponent): PhysicsBodyComponent;
};

export type TilemapCollisionSystemOptions = {
  tileHalfExtent?: number;
  iterations?: number;
  maxStepUp?: number;
  maxStepDown?: number;
  isBlockedAt?: (tileX: number, tileY: number) => boolean;
};

const EPSILON = 1e-8;

export class TilemapCollisionSystem implements System {
  public readonly phase = SystemPhase.Collision;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly playerRadius: number;
  private readonly tileHalfExtent: number;
  private readonly iterations: number;
  private readonly maxStepUp: number;
  private readonly maxStepDown: number;
  private readonly isBlockedAt?: (tileX: number, tileY: number) => boolean;
  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    options: TilemapCollisionSystemOptions,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.tileHalfExtent = Math.max(0.1, options.tileHalfExtent ?? 0.5);
    this.iterations = Math.max(1, Math.floor(options.iterations ?? 4));
    this.maxStepUp = Math.max(0, options.maxStepUp ?? 0.75);
    this.maxStepDown = Math.max(0, options.maxStepDown ?? 2);
    this.isBlockedAt = options.isBlockedAt;
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry
      .query()
      .with(TransformComponent)
      .with(PhysicsBodyComponent)
      .with(MovementIntentComponent)
      .with(TopDownControllerComponent);
  }

  public update(): void {
    if (!this.query) {
      return;
    }

    for (const actor of this.query.run() as CollisionActorEntity[]) {
      const transform = actor.getComponent(TransformComponent);
      const body = actor.getComponent(PhysicsBodyComponent);
      const position = transform.transform.position.clone();
      const totalCorrection = Vector2D.zero;

      let hadCollision = false;

      for (let i = 0; i < this.iterations; i++) {
        const correction = this.resolvePass(position, Math.max(0.05, actor.collisionRadius));
        if (correction.magnitude <= EPSILON) {
          break;
        }

        hadCollision = true;
        position.x += correction.x;
        position.y += correction.y;
        totalCorrection.x += correction.x;
        totalCorrection.y += correction.y;
      }

      if (!hadCollision) {
        continue;
      }

      transform.setPosition(position);

      if (totalCorrection.magnitude <= EPSILON) {
        continue;
      }

      const velocity = body.getVelocity();
      const normal = totalCorrection.normalize();
      const velocityAlongNormal = velocity.dot(normal);
      if (velocityAlongNormal < 0) {
        const adjusted = velocity.subtract(normal.multiply(velocityAlongNormal));
        body.setVelocity(adjusted.magnitude <= EPSILON ? Vector2D.zero : adjusted);
      }
    }
  }

  private resolvePass(position: Vector2D, collisionRadius: number): Vector2D {
    const currentElevation = this.map.getElevationAt(position.x, position.y);
    const minX = Math.floor(position.x - collisionRadius - this.tileHalfExtent);
    const maxX = Math.floor(position.x + collisionRadius + this.tileHalfExtent);
    const minY = Math.floor(position.y - collisionRadius - this.tileHalfExtent);
    const maxY = Math.floor(position.y + collisionRadius + this.tileHalfExtent);

    let best: Vector2D | null = null;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = this.map.getTile(x, y);
        const blockedByDynamicObstacle = this.isBlockedAt?.(x, y) ?? false;

        const correction = this.circleVsTileCorrection(position, collisionRadius, x, y);
        if (!correction) {
          continue;
        }

        const probeX = clamp(position.x, x - this.tileHalfExtent, x + this.tileHalfExtent);
        const probeY = clamp(position.y, y - this.tileHalfExtent, y + this.tileHalfExtent);
        const targetElevation = this.map.getElevationAt(probeX, probeY);
        const elevationDelta = targetElevation - currentElevation;
        const blockedByElevation =
          elevationDelta > this.maxStepUp || elevationDelta < -this.maxStepDown;

        if (!tile.blocking && !blockedByElevation && !blockedByDynamicObstacle) {
          continue;
        }

        if (!best || correction.magnitude > best.magnitude) {
          best = correction;
        }
      }
    }

    return best ?? Vector2D.zero;
  }

  private circleVsTileCorrection(position: Vector2D, collisionRadius: number, tileX: number, tileY: number): Vector2D | null {
    const minX = tileX - this.tileHalfExtent;
    const maxX = tileX + this.tileHalfExtent;
    const minY = tileY - this.tileHalfExtent;
    const maxY = tileY + this.tileHalfExtent;

    const closestX = clamp(position.x, minX, maxX);
    const closestY = clamp(position.y, minY, maxY);
    const dx = position.x - closestX;
    const dy = position.y - closestY;
    const distSq = dx * dx + dy * dy;
    const radiusSq = collisionRadius * collisionRadius;

    if (distSq >= radiusSq) {
      return null;
    }

    if (distSq > EPSILON) {
      const dist = Math.sqrt(distSq);
      const penetration = collisionRadius - dist;
      return new Vector2D((dx / dist) * penetration, (dy / dist) * penetration);
    }

    const tileCenterX = tileX;
    const tileCenterY = tileY;
    const axisX = position.x >= tileCenterX ? 1 : -1;
    const axisY = position.y >= tileCenterY ? 1 : -1;
    const pushX = collisionRadius + this.tileHalfExtent - Math.abs(position.x - tileCenterX);
    const pushY = collisionRadius + this.tileHalfExtent - Math.abs(position.y - tileCenterY);

    if (pushX < pushY) {
      return new Vector2D(axisX * pushX, 0);
    }

    return new Vector2D(0, axisY * pushY);
  }
}
