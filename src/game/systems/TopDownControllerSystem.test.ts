import { beforeEach, describe, expect, test } from "bun:test";
import {
  CollisionEntity,
  EcsRuntime,
  Entity,
  PhysicsBodyComponent,
  PhysicsBodyType,
  PhysicsSystem,
  RectangleCollisionShape,
  TransformComponent,
  Vector2D,
  World,
} from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { TopDownControllerSystem } from "./TopDownControllerSystem.ts";

class ActorEntity extends Entity {
  public readonly intent: MovementIntentComponent;
  public readonly body: PhysicsBodyComponent;
  public readonly transform: TransformComponent;

  public constructor(position: Vector2D) {
    super();
    this.transform = new TransformComponent({ position, rotation: 0, scale: 1 });
    this.intent = new MovementIntentComponent();
    this.body = new PhysicsBodyComponent({
      type: PhysicsBodyType.Dynamic,
      gravityScale: 0,
      linearDamping: 0,
    });

    this.addComponent(this.transform);
    this.addComponent(this.intent);
    this.addComponent(new TopDownControllerComponent({ maxSpeed: 6, acceleration: 24 }));
    this.addComponent(this.body);
    this.addChild(new CollisionEntity(new RectangleCollisionShape(0.8, 0.8), "center"));
  }

  public override update(_dt: number): void {}
}

const stepN = (world: World, n: number, dt: number): void => {
  for (let i = 0; i < n; i++) {
    world.step(dt);
  }
};

beforeEach(() => {
  EcsRuntime.reset();
});

describe("TopDownControllerSystem", () => {
  test("accelerates toward intent direction", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 64, tileHeight: 32 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const actor = new ActorEntity(new Vector2D(0, 0));
    actor.awake();
    actor.intent.setIntent(0, 1, false, false);

    stepN(world, 30, 1 / 60);

    expect(actor.body.getVelocity().x).toBeLessThan(0);
    expect(actor.body.getVelocity().y).toBeLessThan(0);
    expect(actor.transform.transform.position.x).toBeLessThan(0);
    expect(actor.transform.transform.position.y).toBeLessThan(0);
  });

  test("applies damping when no input", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 64, tileHeight: 32 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const actor = new ActorEntity(new Vector2D(0, 0));
    actor.awake();
    actor.intent.setIntent(0, 1, false, false);
    stepN(world, 30, 1 / 60);

    const movingSpeed = actor.body.getVelocity().magnitude;

    actor.intent.setIntent(0, 0, false, false);
    stepN(world, 30, 1 / 60);

    expect(actor.body.getVelocity().magnitude).toBeLessThan(movingSpeed);
  });

  test("strafe movement follows facing-relative controls", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 64, tileHeight: 32 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const actor = new ActorEntity(new Vector2D(0, 0));
    actor.awake();
    actor.intent.setIntent(1, 0, false, false);

    stepN(world, 20, 1 / 60);

    expect(actor.transform.transform.position.x).toBeGreaterThan(0.2);
    expect(actor.transform.transform.position.y).toBeLessThan(-0.2);
  });

  test("walk and crouch reduce movement speed", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 64, tileHeight: 32 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const runActor = new ActorEntity(new Vector2D(0, 0));
    runActor.awake();
    runActor.intent.setIntent(0, 1, false, false);

    const walkActor = new ActorEntity(new Vector2D(0, 2));
    walkActor.awake();
    walkActor.intent.setIntent(0, 1, true, false);

    const crouchActor = new ActorEntity(new Vector2D(0, 4));
    crouchActor.awake();
    crouchActor.intent.setIntent(0, 1, true, true);

    stepN(world, 30, 1 / 60);

    expect(runActor.body.getVelocity().magnitude).toBeGreaterThan(walkActor.body.getVelocity().magnitude);
    expect(walkActor.body.getVelocity().magnitude).toBeGreaterThan(crouchActor.body.getVelocity().magnitude);
  });
});
