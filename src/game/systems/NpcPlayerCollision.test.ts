import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D, World } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { NpcEntity } from "../entities/NpcEntity.ts";
import { ObstacleCollisionSystem } from "./ObstacleCollisionSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("NPC/player collision", () => {
  test("player is pushed out of overlapping NPC movement colliders", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
      const npc = new NpcEntity(new Vector2D(0.2, 0), 11);
      player.awake();
      npc.awake();

      const world = new World({ runtime, fixedDeltaTime: 1 / 60 });
      world.addSystem(new ObstacleCollisionSystem(player, { iterations: 5 }, runtime));
      world.step(1 / 60);

      expect(player.transform.transform.position.x).toBeLessThan(0);
    });
  });
});
