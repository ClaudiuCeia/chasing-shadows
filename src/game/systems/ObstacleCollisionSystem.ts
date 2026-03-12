import {
  CollisionEntity,
  PhysicsBodyComponent,
  SpatialHashBroadphase,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  EcsRuntime,
  type Entity,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { ObstacleComponent } from "../components/ObstacleComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";

const EPSILON = 1e-8;
const SEPARATION_EPSILON = 1e-4;

export type ObstacleCollisionSystemOptions = {
  iterations?: number;
  broadphaseCellSize?: number;
};

export class ObstacleCollisionSystem implements System {
  public readonly phase = SystemPhase.Collision;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly iterations: number;
  private readonly broadphase: SpatialHashBroadphase;
  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(
    private readonly player: PlayerEntity,
    options: ObstacleCollisionSystemOptions = {},
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.iterations = Math.max(1, Math.floor(options.iterations ?? 4));
    this.broadphase = new SpatialHashBroadphase(options.broadphaseCellSize ?? 2);
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(ObstacleComponent);
  }

  public update(): void {
    if (!this.query) {
      return;
    }

    const transform = this.player.getComponent(TransformComponent);
    const body = this.player.getComponent(PhysicsBodyComponent);
    const playerCollider = this.player.movementCollider;

    const obstacleColliders = this.collectBlockingColliders();
    if (obstacleColliders.length === 0) {
      return;
    }

    const totalCorrection = Vector2D.zero;
    let hadCollision = false;

    for (let i = 0; i < this.iterations; i++) {
      const correction = this.resolvePass(playerCollider, obstacleColliders);
      if (correction.magnitude <= EPSILON) {
        break;
      }

      hadCollision = true;
      transform.translate(correction.x, correction.y);
      totalCorrection.x += correction.x;
      totalCorrection.y += correction.y;
    }

    if (!hadCollision || totalCorrection.magnitude <= EPSILON) {
      return;
    }

    const normal = totalCorrection.normalize();
    const velocity = body.getVelocity();
    const velocityAlongNormal = velocity.dot(normal);
    if (velocityAlongNormal < 0) {
      const adjusted = velocity.subtract(normal.multiply(velocityAlongNormal));
      body.setVelocity(adjusted.magnitude <= EPSILON ? Vector2D.zero : adjusted);
    }
  }

  private collectBlockingColliders(): CollisionEntity[] {
    const colliders: CollisionEntity[] = [];

    for (const entity of this.query?.run() as Entity[]) {
      if (entity.id === this.player.id) {
        continue;
      }

      const obstacle = entity.getComponent(ObstacleComponent);
      if (!obstacle.blocksMovement) {
        continue;
      }

      const collider = entity.getChild(CollisionEntity);
      if (collider) {
        colliders.push(collider);
      }
    }

    return colliders;
  }

  private resolvePass(playerCollider: CollisionEntity, obstacleColliders: readonly CollisionEntity[]): Vector2D {
    const playerBox = playerCollider.bbox();
    const playerCenter = new Vector2D(playerBox.x + playerBox.width / 2, playerBox.y + playerBox.height / 2);
    let best: Vector2D | null = null;

    const pairs = this.broadphase.queryPairs([playerCollider, ...obstacleColliders]);
    for (const [a, b] of pairs) {
      const collider = a.id === playerCollider.id ? b : b.id === playerCollider.id ? a : null;
      if (!collider) {
        continue;
      }

      const correction = playerCollider.getCollisionNormal(collider);
      if (!correction) {
        continue;
      }

      const obstacleBox = collider.bbox();
      const obstacleCenter = new Vector2D(
        obstacleBox.x + obstacleBox.width / 2,
        obstacleBox.y + obstacleBox.height / 2,
      );
      const fallback = playerCenter.subtract(obstacleCenter);
      const direction =
        correction.magnitude > EPSILON
          ? correction.normalize()
          : fallback.magnitude > EPSILON
            ? fallback.normalize()
            : new Vector2D(1, 0);
      const resolvedCorrection = direction.multiply(Math.max(correction.magnitude, SEPARATION_EPSILON));

      if (!best || resolvedCorrection.magnitude > best.magnitude) {
        best = resolvedCorrection;
      }
    }

    return best ?? Vector2D.zero;
  }
}
