import { RectangleCollisionShape, TransformComponent } from "@claudiu-ceia/tick";
import { COLLISION_LAYER_OBSTACLE } from "../collision/collision-layers.ts";
import { HitColliderEntity } from "./HitColliderEntity.ts";
import { ObstacleEntity } from "./ObstacleEntity.ts";

const DEFAULT_OBSTACLE_HIT_HEIGHT = 1.8;

export class ObstacleHitColliderEntity extends HitColliderEntity {
  public constructor(bodyHeight = DEFAULT_OBSTACLE_HIT_HEIGHT) {
    super(new RectangleCollisionShape(1, 1), "top-left", COLLISION_LAYER_OBSTACLE, bodyHeight);
  }

  public syncFromObstacle(obstacle: ObstacleEntity): void {
    const movementBounds = obstacle.movementCollider.bbox();
    this.resize(movementBounds.width, movementBounds.height);
    const transform = this.getComponent(TransformComponent);
    transform.parent = null;
    transform.setPosition(movementBounds.x, movementBounds.y);
    transform.setRotation(0);
  }

  public override awake(): void {
    super.awake();
    const parent = this.parent;
    if (parent instanceof ObstacleEntity) {
      this.syncFromObstacle(parent);
    }
  }

  public override update(deltaTime: number): void {
    super.update(deltaTime);
    const parent = this.parent;
    if (parent instanceof ObstacleEntity) {
      this.syncFromObstacle(parent);
    }
  }
}
