import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D, World } from "@claudiu-ceia/tick";
import { LootBoxEntity } from "../entities/LootBoxEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { WorldStateEntity } from "../entities/WorldStateEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { RaycastSystem } from "./RaycastSystem.ts";
import { VisibilitySystem } from "./VisibilitySystem.ts";
import { StructureRotation } from "../structures/structure-types.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("VisibilitySystem", () => {
  test("marks tiles traversed by the player's visible ray fan", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const worldState = new WorldStateEntity({ seed: 123, spawnChance: 0 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);

    worldState.awake();
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(6, Math.PI / 3, 21);

    world.addSystem(new RaycastSystem(map));
    world.addSystem(new VisibilitySystem(map, player));
    world.step(1 / 60);

    expect(worldState.visibility.isTileVisible(0, 0)).toBeTrue();
    expect(worldState.visibility.getVisibleTiles().length).toBeGreaterThan(3);
  });

  test("does not mark tiles behind blocking hit colliders as visible", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const worldState = new WorldStateEntity({ seed: 123, spawnChance: 0 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);

    worldState.awake();
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(8, 0, 1);

    const obstacle = new LootBoxEntity(2, 0, 0, map.getElevationAt(2, 0));
    obstacle.hitCollider.setBodyHeight(8);
    obstacle.awake();

    world.addSystem(new RaycastSystem(map));
    world.addSystem(new VisibilitySystem(map, player));
    world.step(1 / 60);

    expect(worldState.visibility.isTileVisible(2, 0)).toBeTrue();
    expect(worldState.visibility.isTileVisible(4, 0)).toBeFalse();
  });

  test("reveals nearby tiles through the proximity circle even outside the emitter fan", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const worldState = new WorldStateEntity({ seed: 123, spawnChance: 0 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);

    worldState.awake();
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(0.5, 0, 1);

    world.addSystem(new RaycastSystem(map));
    world.addSystem(new VisibilitySystem(map, player));
    world.step(1 / 60);

    expect(worldState.visibility.isTileVisible(0, 2)).toBeTrue();
    expect(worldState.visibility.isTileVisible(-2, 0)).toBeTrue();
    expect(worldState.visibility.isTileVisible(3, 0)).toBeFalse();
  });

  test("resolves visible static object ids from visible tiles", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const worldState = new WorldStateEntity({ seed: 123, spawnChance: 0 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);

    worldState.awake();
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(6, 0, 1);

    const visibleLoot = new LootBoxEntity(2, 0, 0, map.getElevationAt(2, 0));
    visibleLoot.awake();
    const hiddenLoot = new LootBoxEntity(-4, 0, 0, map.getElevationAt(-4, 0));
    hiddenLoot.awake();

    world.addSystem(new RaycastSystem(map));
    world.addSystem(new VisibilitySystem(map, player));
    world.step(1 / 60);

    expect(worldState.visibility.isStaticObjectVisible(visibleLoot.id)).toBeTrue();
    expect(worldState.visibility.isStaticObjectVisible(hiddenLoot.id)).toBeFalse();
  });

  test("marks structures visible when their footprint intersects visible tiles", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const worldState = new WorldStateEntity({ seed: 123, spawnChance: 0 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);

    worldState.structures.addInstance({
      blueprintId: "poc-shelter-5x5",
      originX: 2,
      originY: -2,
      baseZ: 0,
      rotation: StructureRotation.North,
    });

    worldState.awake();
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(8, Math.PI / 2, 31);

    world.addSystem(new RaycastSystem(map));
    world.addSystem(new VisibilitySystem(map, player));
    world.step(1 / 60);

    expect(worldState.visibility.getVisibleStructureKeys()).toContain("poc-shelter-5x5:2:-2:0:0");
  });

  test("remembers visible tiles after they leave the current view", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const worldState = new WorldStateEntity({ seed: 123, spawnChance: 0 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);

    worldState.awake();
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(6, 0, 1);

    world.addSystem(new RaycastSystem(map));
    world.addSystem(new VisibilitySystem(map, player));
    world.step(1 / 60);

    expect(worldState.visibility.isTileVisible(4, 0)).toBeTrue();
    expect(worldState.visibility.isTileRemembered(4, 0)).toBeTrue();

    player.transform.setRotation(Math.PI);
    player.update(1 / 60);
    world.step(1 / 60);

    expect(worldState.visibility.isTileVisible(4, 0)).toBeFalse();
    expect(worldState.visibility.isTileRemembered(4, 0)).toBeTrue();
    expect(worldState.visibility.isTileVisible(-4, 0)).toBeTrue();
  });

  test("remembers structures after their footprint leaves the current view", () => {
    const world = new World();
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const worldState = new WorldStateEntity({ seed: 123, spawnChance: 0 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap({
      getElevationAt: (x: number, y: number) => map.getElevationAt(x, y),
    } as never);

    worldState.structures.addInstance({
      blueprintId: "poc-shelter-5x5",
      originX: 6,
      originY: -2,
      baseZ: 0,
      rotation: StructureRotation.North,
    });

    worldState.awake();
    player.awake();
    player.update(1 / 60);
    player.transform.setRotation(0);
    player.rayEmitter.setCastProfile(12, Math.PI / 2, 31);

    world.addSystem(new RaycastSystem(map));
    world.addSystem(new VisibilitySystem(map, player));
    world.step(1 / 60);

    const key = "poc-shelter-5x5:6:-2:0:0";
    expect(worldState.visibility.isStructureVisible(key)).toBeTrue();
    expect(worldState.visibility.isStructureRemembered(key)).toBeTrue();

    player.transform.setRotation(Math.PI);
    player.update(1 / 60);
    world.step(1 / 60);

    expect(worldState.visibility.isStructureVisible(key)).toBeFalse();
    expect(worldState.visibility.isStructureRemembered(key)).toBeTrue();
  });
});
