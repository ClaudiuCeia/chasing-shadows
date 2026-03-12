import { beforeEach, describe, expect, test } from "bun:test";
import { CollisionEntity, EcsRuntime, PhysicsSystem, Vector2D, World } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { LootBoxEntity } from "../entities/LootBoxEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { ObstacleCollisionSystem } from "./ObstacleCollisionSystem.ts";
import { TopDownControllerSystem } from "./TopDownControllerSystem.ts";
import { TilemapCollisionSystem } from "./TilemapCollisionSystem.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { createTileCornerHeights, createTileData } from "../world/tile-types.ts";

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

    const player = new PlayerEntity(new Vector2D(0, 0), 7, 8);
    player.awake();
    player.transform.transform.rotation = 0;
    player.getComponent(MovementIntentComponent).setIntent(0, 1, false, false);

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

    const player = new PlayerEntity(new Vector2D(0, 0), 7, 8);
    player.awake();
    player.transform.transform.rotation = Math.PI;
    player.getComponent(MovementIntentComponent).setIntent(0, 1, false, false);

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

    const player = new PlayerEntity(new Vector2D(0.2, 0), 7, 8);
    player.awake();
    player.body.setVelocity(new Vector2D(2.6, 1.2));

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
      }),
    );

    stepN(world, 20, 1 / 60);

    const velocity = player.body.getVelocity();
    expect(velocity.y).toBeGreaterThanOrEqual(0);
    expect(velocity.x).toBeLessThan(0.3);
  });

  test("blocks steep step-up even on non-blocking tiles", () => {
    const map = new InfiniteTilemap({ seed: 41, chunkSize: 16 });
    map.setTileData(1, 0, {
      ...createTileData("regolith"),
      elevation: 3,
      occluder: true,
      corners: createTileCornerHeights(3),
    });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7, 8);
    player.awake();
    player.transform.transform.rotation = 0;
    player.getComponent(MovementIntentComponent).setIntent(0, 1, false, false);

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
      corners: createTileCornerHeights(3),
    });
    map.setTileData(1, 0, {
      ...createTileData("regolith"),
      elevation: 0,
      occluder: false,
      corners: createTileCornerHeights(0),
    });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7, 8);
    player.awake();
    player.transform.transform.rotation = 0;
    player.getComponent(MovementIntentComponent).setIntent(0, 1, false, false);

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

  test("blocks excessive drop-offs from the southwest edge of a raised tile", () => {
    const map = new InfiniteTilemap({ seed: 53, chunkSize: 16 });
    map.setTileData(0, 0, {
      ...createTileData("regolith"),
      elevation: 2,
      occluder: true,
      corners: createTileCornerHeights(2),
    });
    map.setTileData(-1, 0, {
      ...createTileData("regolith"),
      elevation: 0,
      occluder: false,
      corners: createTileCornerHeights(0),
    });
    map.setTileData(0, 1, {
      ...createTileData("regolith"),
      elevation: 0,
      occluder: false,
      corners: createTileCornerHeights(0),
    });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(-0.35, 0), 7, 8);
    player.awake();
    player.transform.transform.rotation = Math.PI / 2;
    player.getComponent(MovementIntentComponent).setIntent(0, 1, false, false);

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
        maxStepUp: 1,
        maxStepDown: 1,
      }),
    );

    stepN(world, 220, 1 / 60);
    expect(player.transform.transform.position.y).toBeLessThanOrEqual(0.31);
  });

  test("blocks movement against dynamic blockers", () => {
    const map = new InfiniteTilemap({ seed: 63, chunkSize: 16 });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7, 8);
    player.awake();
    player.transform.transform.rotation = 0;
    player.getComponent(MovementIntentComponent).setIntent(0, 1, false, false);

    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
        isBlockedAt: (tileX, tileY) => tileX === 1 && tileY === 0,
      }),
    );

    stepN(world, 220, 1 / 60);
    expect(player.transform.transform.position.x).toBeLessThanOrEqual(0.31);
  });

  test("blocks movement against generic obstacle entities", () => {
    const map = new InfiniteTilemap({ seed: 64, chunkSize: 16 });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new TopDownControllerSystem({ isoConfig: { tileWidth: 128, tileHeight: 64 } }));
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0, 0), 7, 8);
    player.awake();
    player.transform.transform.rotation = 0;
    player.getComponent(MovementIntentComponent).setIntent(0, 1, false, false);

    const obstacle = new LootBoxEntity(1, 0, 0, 0);
    obstacle.awake();

    world.addSystem(new ObstacleCollisionSystem(player));
    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
      }),
    );

    stepN(world, 220, 1 / 60);
    expect(player.transform.transform.position.x).toBeLessThanOrEqual(0.31);
  });

  test("resolves obstacle overlap in a single fixed update", () => {
    const map = new InfiniteTilemap({ seed: 65, chunkSize: 16 });

    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PhysicsSystem({ gravity: Vector2D.zero }));

    const player = new PlayerEntity(new Vector2D(0.9, 0), 7, 8);
    player.awake();

    const obstacle = new LootBoxEntity(1, 0, 0, 0);
    obstacle.awake();

    world.addSystem(new ObstacleCollisionSystem(player, { iterations: 6 }));
    world.addSystem(
      new TilemapCollisionSystem(map, player, {
        playerRadius: player.collisionRadius,
      }),
    );

    world.step(1 / 60);

    const playerCollider = player.getChild(CollisionEntity);
    const obstacleCollider = obstacle.getChild(CollisionEntity);
    expect(playerCollider).not.toBeNull();
    expect(obstacleCollider).not.toBeNull();
    expect(playerCollider?.isColliding(obstacleCollider!)).toBeFalse();
  });
});
