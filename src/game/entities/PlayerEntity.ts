import {
  CollisionEntity,
  CircleCollisionShape,
  Entity,
  PhysicsBodyComponent,
  PhysicsBodyType,
  TransformComponent,
  Vector2D,
} from "@claudiu-ceia/tick";
import { HealthComponent } from "../components/HealthComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { NeedsComponent } from "../components/NeedsComponent.ts";
import { PlayerTagComponent } from "../components/PlayerTagComponent.ts";
import { TemperatureComponent } from "../components/TemperatureComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { COLLISION_LAYER_OBSTACLE, COLLISION_LAYER_PLAYER } from "../physics/collision-layers.ts";

export class PlayerEntity extends Entity {
  public readonly collisionRadius = 0.2;

  public readonly transform: TransformComponent;
  public readonly body: PhysicsBodyComponent;
  public readonly needs: NeedsComponent;
  public readonly temperature: TemperatureComponent;
  public readonly health: HealthComponent;

  public constructor(spawn: Vector2D, baseSpeed: number) {
    super();

    this.transform = new TransformComponent({ position: spawn, rotation: 0, scale: 1 });
    this.body = new PhysicsBodyComponent({
      type: PhysicsBodyType.Dynamic,
      gravityScale: 0,
      linearDamping: 0,
      friction: 0.2,
      restitution: 0,
      canSleep: false,
    });

    this.needs = new NeedsComponent();
    this.temperature = new TemperatureComponent();
    this.health = new HealthComponent();

    this.addComponent(this.transform);
    this.addComponent(new PlayerTagComponent());
    this.addComponent(new MovementIntentComponent());
    this.addComponent(
      new TopDownControllerComponent({
        maxSpeed: baseSpeed,
        acceleration: baseSpeed * 12,
        damping: 18,
        sprintMultiplier: 1.45,
      }),
    );
    this.addComponent(this.body);
    this.addComponent(this.health);
    this.addComponent(this.needs);
    this.addComponent(this.temperature);

    this.addChild(
      new CollisionEntity(
        new CircleCollisionShape(this.collisionRadius),
        "center",
        COLLISION_LAYER_PLAYER,
        COLLISION_LAYER_OBSTACLE,
      ),
    );
  }

  public override update(_dt: number): void {}
}
