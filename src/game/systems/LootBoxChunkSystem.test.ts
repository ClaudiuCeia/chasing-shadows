import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D, World } from "@claudiu-ceia/tick";
import { LootBoxSpriteComponent } from "../render/LootBoxSpriteComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { WorldStateEntity } from "../entities/WorldStateEntity.ts";
import { LOOT_BOX_SLOT_COUNT } from "../world/LootBoxField.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { LootBoxChunkSystem } from "./LootBoxChunkSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("LootBoxChunkSystem", () => {
  test("spawns and despawns loot entities from field state", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 12, chunkSize: 16 });
      map.setTile(0, 0, "regolith");

      const worldState = new WorldStateEntity({ seed: 12, spawnChance: 0 });
      worldState.awake();
      const field = worldState.lootField;
      field.setSlots(
        0,
        0,
        Array.from({ length: LOOT_BOX_SLOT_COUNT }, (_unused, index) =>
          index === 0 ? { itemId: "body-armor", count: 3 } : null,
        ),
      );

      const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
      player.awake();

      const world = new World({ runtime, fixedDeltaTime: 1 / 60 });
      world.addSystem(new LootBoxChunkSystem(map, player, 0, runtime));
      world.step(1 / 60);

      const query = runtime.registry.query().with(TilePositionComponent).with(LootBoxSpriteComponent);
      expect([...query.run()]).toHaveLength(1);

      field.setSlots(0, 0, Array.from({ length: LOOT_BOX_SLOT_COUNT }, () => null));
      world.step(1 / 60);

      expect([...query.run()]).toHaveLength(1);
    });
  });
});
