import {
  CollisionEntity,
  TransformComponent,
  Vector2D,
  type CollisionAnchor,
  type CollisionShape,
  Entity,
} from "@claudiu-ceia/tick";
import { COLLISION_LAYER_OBSTACLE, COLLISION_LAYER_PLAYER } from "../collision/collision-layers.ts";
import { ObstacleComponent } from "../components/ObstacleComponent.ts";
import { ObstacleHitColliderEntity } from "./ObstacleHitColliderEntity.ts";

export type ObstacleEntityOptions = {
  position: Vector2D;
  shape: CollisionShape;
  anchor?: CollisionAnchor;
  layer?: number;
  collisionMask?: number;
  hitHeight?: number;
};

export class ObstacleEntity extends Entity {
  public readonly obstacle: ObstacleComponent;
  public readonly transform: TransformComponent;
  public readonly movementCollider: CollisionEntity;
  public readonly hitCollider: ObstacleHitColliderEntity;

  public constructor(options: ObstacleEntityOptions) {
    super();
    this.obstacle = new ObstacleComponent();
    this.transform = new TransformComponent({
      position: options.position.clone(),
      rotation: 0,
      scale: 1,
    });
    this.movementCollider = new CollisionEntity(
      options.shape,
      options.anchor ?? "center",
      options.layer ?? COLLISION_LAYER_OBSTACLE,
      options.collisionMask ?? COLLISION_LAYER_PLAYER,
    );
    this.hitCollider = new ObstacleHitColliderEntity(options.hitHeight);

    this.addComponent(this.obstacle);
    this.addComponent(this.transform);
    this.addChild(this.movementCollider);
    this.addChild(this.hitCollider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }
}
