import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D, World } from "@claudiu-ceia/tick";
import { NpcTagComponent } from "../components/NpcTagComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { NpcChunkSystem } from "./NpcChunkSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("NpcChunkSystem", () => {
  test("spawns NPCs in the active chunk window and refreshes on chunk changes", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 12, chunkSize: 4 });
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          map.setTile(x, y, "regolith");
        }
      }

      const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
      player.awake();

      const world = new World({ runtime, fixedDeltaTime: 1 / 60 });
      world.addSystem(new NpcChunkSystem(map, player, 0, 1, runtime));
      world.step(1 / 60);

      const query = runtime.registry.query().with(NpcTagComponent);
      const initialIds = [...query.run()].map((entity) => entity.id);
      expect(initialIds.length).toBeGreaterThan(0);

      player.transform.setPosition(new Vector2D(4, 0));
      world.step(1 / 60);

      const nextIds = [...query.run()].map((entity) => entity.id);
      expect(nextIds.length).toBeGreaterThan(0);
      expect(nextIds).not.toEqual(initialIds);
    });
  });
});
