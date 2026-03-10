import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, PhysicsSystem, Vector2D, World } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { TopDownControllerSystem } from "./TopDownControllerSystem.ts";
import { TilemapCollisionSystem } from "./TilemapCollisionSystem.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

const stepN = (world: World, n: number, dt: number): void => {
  for (let i = 0; i < n; i++) {
    world.step(dt);
  }
};

beforeEach(() => {
  EcsRuntime.reset();
});

describe("TilemapCollisionSystem", () => {
  test("prevents crossing blocking rock tiles", () => {
    const map = new InfiniteTilemap({ seed: 10, chunkSize: 16 });
    map.setTile(1, 0, "rock");

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7);
    player.awake();
    player.getComponent(MovementIntentComponent).setMoveTarget(3, 0);

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
      }),
    );

    stepN(world, 220, 1 / 60);

    expect(player.transform.transform.position.x).toBeLessThanOrEqual(0.31);
  });

  test("does not block movement in open terrain", () => {
    const map = new InfiniteTilemap({ seed: 22, chunkSize: 16 });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7);
    player.awake();
    player.getComponent(MovementIntentComponent).setMoveTarget(-2, 0);

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
      }),
    );

    stepN(world, 120, 1 / 60);

    expect(player.transform.transform.position.x).toBeLessThan(-0.5);
  });

  test("preserves tangential velocity when colliding", () => {
    const map = new InfiniteTilemap({ seed: 33, chunkSize: 16 });
    map.setTile(1, 0, "rock");

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0.2, 0), 7);
    player.awake();
    player.body.setVelocity(new Vector2D(2.6, 1.2));

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
      }),
    );

    stepN(world, 20, 1 / 60);

    const velocity = player.body.getVelocity();
    expect(velocity.y).toBeGreaterThan(0);
    expect(velocity.x).toBeLessThan(0.3);
  });
});
