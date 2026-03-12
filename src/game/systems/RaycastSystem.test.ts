import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D, World } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { LootBoxEntity } from "../entities/LootBoxEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { RaycastSystem } from "./RaycastSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("RaycastSystem", () => {
  test("casts the player's primary LOS ray", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(5, 0, 1);

    world.addSystem(new RaycastSystem(map));
    world.step(1 / 60);

    const ray = player.rayEmitter.getPrimaryRay();
    expect(ray).not.toBeNull();
    expect(ray?.distance).toBeGreaterThan(0);
    expect(ray?.direction.x).toBeGreaterThan(0.9);
  });

  test("hits obstacle hit colliders before max range", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(8, 0, 1);

    const obstacle = new LootBoxEntity(2, 0, 0, map.getElevationAt(2, 0));
    obstacle.hitCollider.setBodyHeight(8);
    obstacle.awake();

    world.addSystem(new RaycastSystem(map));
    world.step(1 / 60);

    const ray = player.rayEmitter.getPrimaryRay();
    expect(ray?.hit?.type).toBe("collider");
    expect(ray?.hit?.entity?.id).toBe(obstacle.id);
    expect(ray?.hit?.collider?.id).toBe(obstacle.hitCollider.id);
  });
});
