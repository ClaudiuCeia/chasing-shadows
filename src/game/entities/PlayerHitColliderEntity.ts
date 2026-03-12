import { CollisionEntity, RectangleCollisionShape, TransformComponent, Vector2D } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { COLLISION_LAYER_PLAYER_HIT } from "../collision/collision-layers.ts";
import { PlayerEntity } from "./PlayerEntity.ts";

export type PlayerPosture = "standing" | "crouched";

const PLAYER_HIT_BOX_DIMENSIONS: Record<PlayerPosture, { width: number; depth: number; height: number }> = {
  standing: {
    width: 0.48,
    depth: 0.32,
    height: 4.3,
  },
  crouched: {
    width: 0.54,
    depth: 0.38,
    height: 3.1,
  },
};

export class PlayerHitColliderEntity extends CollisionEntity {
  public static readonly standingHeight = PLAYER_HIT_BOX_DIMENSIONS.standing.height;
  public static readonly crouchedHeight = PLAYER_HIT_BOX_DIMENSIONS.crouched.height;

  public bodyHeight = 0;

  public constructor() {
    const dimensions = PLAYER_HIT_BOX_DIMENSIONS.standing;
    super(new RectangleCollisionShape(dimensions.width, dimensions.depth), "top-left", COLLISION_LAYER_PLAYER_HIT, 0);
    this.sync("standing", Vector2D.zero);
  }

  public sync(posture: PlayerPosture, position: Vector2D): void {
    const dimensions = PLAYER_HIT_BOX_DIMENSIONS[posture];
    this.resize(dimensions.width, dimensions.depth);
    this.bodyHeight = dimensions.height;
    const transform = this.getComponent(TransformComponent);
    transform.parent = null;
    transform.setPosition(position.x - dimensions.width / 2, position.y - dimensions.depth / 2);
    transform.setRotation(0);
  }

  public syncFromPlayer(player: PlayerEntity): void {
    const posture: PlayerPosture = player.getComponent(MovementIntentComponent).crouch ? "crouched" : "standing";
    this.sync(posture, player.transform.transform.position);
  }

  public override awake(): void {
    super.awake();
    const parent = this.parent;
    if (parent instanceof PlayerEntity) {
      this.syncFromPlayer(parent);
    }
  }

  public override update(deltaTime: number): void {
    super.update(deltaTime);
    const parent = this.parent;
    if (parent instanceof PlayerEntity) {
      this.syncFromPlayer(parent);
    }
  }
}
