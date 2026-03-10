import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, PhysicsSystem, Vector2D, World } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { TopDownControllerSystem } from "./TopDownControllerSystem.ts";
import { TilemapCollisionSystem } from "./TilemapCollisionSystem.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { createTileData } from "../world/tile-types.ts";

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
    map.setTileData(1, 0, {
      ...createTileData("rock"),
      blocking: true,
      occluder: true,
    });

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
    map.setTileData(1, 0, {
      ...createTileData("rock"),
      blocking: true,
      occluder: true,
    });

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

  test("blocks steep step-up even on non-blocking tiles", () => {
    const map = new InfiniteTilemap({ seed: 41, chunkSize: 16 });
    map.setTileData(1, 0, {
      ...createTileData("regolith"),
      elevation: 3,
      occluder: true,
    });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7);
    player.awake();
    player.getComponent(MovementIntentComponent).setMoveTarget(2, 0);

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
        maxStepUp: 0.8,
      }),
    );

    stepN(world, 220, 1 / 60);
    expect(player.transform.transform.position.x).toBeLessThanOrEqual(0.31);
  });

  test("blocks excessive drop-offs", () => {
    const map = new InfiniteTilemap({ seed: 52, chunkSize: 16 });
    map.setTileData(0, 0, {
      ...createTileData("regolith"),
      elevation: 3,
      occluder: true,
    });
    map.setTileData(1, 0, {
      ...createTileData("regolith"),
      elevation: 0,
      occluder: false,
    });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7);
    player.awake();
    player.getComponent(MovementIntentComponent).setMoveTarget(1.5, 0);

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
        maxStepUp: 1,
        maxStepDown: 0.75,
      }),
    );

    stepN(world, 220, 1 / 60);
    expect(player.transform.transform.position.x).toBeLessThanOrEqual(0.31);
  });

  test("blocks movement against dynamic blockers", () => {
    const map = new InfiniteTilemap({ seed: 63, chunkSize: 16 });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7);
    player.awake();
    player.getComponent(MovementIntentComponent).setMoveTarget(3, 0);

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
        isBlockedAt: (tileX, tileY) => tileX === 1 && tileY === 0,
      }),
    );

    stepN(world, 220, 1 / 60);
    expect(player.transform.transform.position.x).toBeLessThanOrEqual(0.31);
  });
});
