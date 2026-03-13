import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { GAME_CONFIG } from "../config/game-config.ts";
import { LootBoxEntity } from "../entities/LootBoxEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { InteractableHighlightSystem } from "./InteractableHighlightSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("InteractableHighlightSystem", () => {
  test("highlights only the nearest interactable within range", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);
      const nearBox = new LootBoxEntity(1, 0, 0, 0);
      const farBox = new LootBoxEntity(1.2, 0.2, 1, 0);
      player.awake();
      nearBox.awake();
      farBox.awake();

      const system = new InteractableHighlightSystem(player, runtime);
      system.awake();
      system.update();

      expect(nearBox.highlight.active).toBeTrue();
      expect(farBox.highlight.active).toBeFalse();
    });
  });
});
