import {
  CollisionEntity,
  EcsRuntime,
  PhysicsBodyComponent,
  SpatialHashBroadphase,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type Entity,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { ObstacleComponent } from "../components/ObstacleComponent.ts";
import { NpcTagComponent } from "../components/NpcTagComponent.ts";
import { NpcEntity } from "../entities/NpcEntity.ts";
import { ObstacleEntity } from "../entities/ObstacleEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";

const EPSILON = 1e-8;
const SEPARATION_EPSILON = 1e-4;

type CollisionNpcEntity = NpcEntity & {
  getComponent(constr: typeof TransformComponent): TransformComponent;
  getComponent(constr: typeof PhysicsBodyComponent): PhysicsBodyComponent;
};

export type NpcObstacleCollisionSystemOptions = {
  iterations?: number;
  broadphaseCellSize?: number;
};

export class NpcObstacleCollisionSystem implements System {
  public readonly phase = SystemPhase.Collision;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly iterations: number;
  private readonly broadphase: SpatialHashBroadphase;
  private readonly runtime: EcsRuntime;
  private obstacleQuery: EntityQuery | null = null;
  private npcQuery: EntityQuery | null = null;

  public constructor(
    private readonly player: PlayerEntity,
    options: NpcObstacleCollisionSystemOptions = {},
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.iterations = Math.max(1, Math.floor(options.iterations ?? 4));
    this.broadphase = new SpatialHashBroadphase(options.broadphaseCellSize ?? 2);
    this.runtime = runtime;
  }

  public awake(): void {
    this.obstacleQuery = this.runtime.registry.query().with(ObstacleComponent);
    this.npcQuery = this.runtime.registry
      .query()
      .with(NpcTagComponent)
      .with(TransformComponent)
      .with(PhysicsBodyComponent);
  }

  public update(): void {
    if (!this.npcQuery || !this.obstacleQuery) {
      return;
    }

    const obstacleColliders = this.collectBlockingColliders();
    if (obstacleColliders.length === 0) {
      return;
    }

    for (const npc of this.npcQuery.run() as CollisionNpcEntity[]) {
      const transform = npc.getComponent(TransformComponent);
      const body = npc.getComponent(PhysicsBodyComponent);
      const totalCorrection = Vector2D.zero;
      let hadCollision = false;

      for (let i = 0; i < this.iterations; i++) {
        const correction = this.resolvePass(npc.movementCollider, obstacleColliders);
        if (correction.magnitude <= EPSILON) {
          break;
        }

        hadCollision = true;
        transform.translate(correction.x, correction.y);
        totalCorrection.x += correction.x;
        totalCorrection.y += correction.y;
      }

      if (!hadCollision || totalCorrection.magnitude <= EPSILON) {
        continue;
      }

      const normal = totalCorrection.normalize();
      const velocity = body.getVelocity();
      const velocityAlongNormal = velocity.dot(normal);
      if (velocityAlongNormal < 0) {
        const adjusted = velocity.subtract(normal.multiply(velocityAlongNormal));
        body.setVelocity(adjusted.magnitude <= EPSILON ? Vector2D.zero : adjusted);
      }
    }
  }

  private collectBlockingColliders(): CollisionEntity[] {
    const colliders: CollisionEntity[] = [this.player.movementCollider];

    for (const entity of this.obstacleQuery?.run() as Entity[]) {
      const obstacle = entity.getComponent(ObstacleComponent);
      if (!obstacle.blocksMovement) {
        continue;
      }

      if (entity instanceof ObstacleEntity) {
        colliders.push(entity.movementCollider);
      }
    }

    return colliders;
  }

  private resolvePass(npcCollider: CollisionEntity, obstacleColliders: readonly CollisionEntity[]): Vector2D {
    const npcBox = npcCollider.bbox();
    const npcCenter = new Vector2D(npcBox.x + npcBox.width / 2, npcBox.y + npcBox.height / 2);
    let best: Vector2D | null = null;

    const pairs = this.broadphase.queryPairs([npcCollider, ...obstacleColliders]);
    for (const [a, b] of pairs) {
      const collider = a.id === npcCollider.id ? b : b.id === npcCollider.id ? a : null;
      if (!collider || collider.id === npcCollider.id) {
        continue;
      }

      const correction = npcCollider.getCollisionNormal(collider);
      if (!correction) {
        continue;
      }

      const obstacleBox = collider.bbox();
      const obstacleCenter = new Vector2D(
        obstacleBox.x + obstacleBox.width / 2,
        obstacleBox.y + obstacleBox.height / 2,
      );
      const fallback = npcCenter.subtract(obstacleCenter);
      const direction = correction.magnitude > EPSILON
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
