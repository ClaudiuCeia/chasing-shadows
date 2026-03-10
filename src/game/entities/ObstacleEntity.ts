import {
  CollisionEntity,
  Entity,
  PhysicsBodyComponent,
  PhysicsBodyType,
  RectangleCollisionShape,
  TransformComponent,
  Vector2D,
} from "@claudiu-ceia/tick";
import { COLLISION_LAYER_OBSTACLE, COLLISION_LAYER_PLAYER } from "../physics/collision-layers.ts";

export class ObstacleEntity extends Entity {
  public constructor(position: Vector2D) {
    super();

    this.addComponent(
      new TransformComponent({
        position,
        rotation: 0,
        scale: 1,
      }),
    );

    this.addComponent(
      new PhysicsBodyComponent({
        type: PhysicsBodyType.Static,
        gravityScale: 0,
        friction: 0.8,
        restitution: 0,
      }),
    );

    this.addChild(
      new CollisionEntity(
        new RectangleCollisionShape(0.9, 0.9),
        "center",
        COLLISION_LAYER_OBSTACLE,
        COLLISION_LAYER_PLAYER,
      ),
    );
  }

  public override update(_dt: number): void {}
}
