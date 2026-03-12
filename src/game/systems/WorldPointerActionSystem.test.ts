import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { GAME_CONFIG } from "../config/game-config.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { UiStateEntity } from "../entities/UiStateEntity.ts";
import { WorldStateEntity } from "../entities/WorldStateEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { PlayerAttackSystem } from "./PlayerAttackSystem.ts";
import { WorldPointerActionSystem } from "./WorldPointerActionSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("WorldPointerActionSystem", () => {
  test("semi-auto re-arms after holding through the finished shot", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const worldState = new WorldStateEntity({ seed: 1, spawnChance: 0 });
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      uiState.awake();
      worldState.awake();
      player.awake();

      PlayerAttackSystem.toggleFireMode(player.attack);
      expect(player.attack.fireMode).toBe("semi");

      const system = new WorldPointerActionSystem(map, runtime);
      system.awake();

      uiState.pointerWorld.setResolved(new Vector2D(5, 0), new Vector2D(0, 0), map.getElevationAt(5, 0));
      uiState.pointerWorld.phase = "press";
      system.update();

      expect(player.attack.active).toBeTrue();
      expect(uiState.pointerWorld.mode).toBe("attack");

      PlayerAttackSystem.tick(player.attack, 1);
      expect(player.attack.active).toBeFalse();
      expect(player.attack.releasedSinceLastShot).toBeFalse();

      uiState.pointerWorld.phase = "hold";
      system.update();
      expect(uiState.pointerWorld.mode).toBeNull();

      uiState.pointerWorld.phase = "release";
      system.update();
      expect(player.attack.releasedSinceLastShot).toBeTrue();

      uiState.pointerWorld.setResolved(new Vector2D(5, 0), new Vector2D(0, 0), map.getElevationAt(5, 0));
      uiState.pointerWorld.phase = "press";
      system.update();

      expect(player.attack.active).toBeTrue();
      expect(uiState.pointerWorld.mode).toBe("attack");
    });
  });

  test("semi-auto release during an active shot does not cancel the animation", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const worldState = new WorldStateEntity({ seed: 1, spawnChance: 0 });
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      uiState.awake();
      worldState.awake();
      player.awake();

      PlayerAttackSystem.toggleFireMode(player.attack);

      const system = new WorldPointerActionSystem(map, runtime);
      system.awake();

      uiState.pointerWorld.setResolved(new Vector2D(5, 0), new Vector2D(0, 0), map.getElevationAt(5, 0));
      uiState.pointerWorld.phase = "press";
      system.update();

      expect(player.attack.active).toBeTrue();

      uiState.pointerWorld.phase = "release";
      system.update();

      expect(player.attack.active).toBeTrue();
      expect(player.attack.releasedSinceLastShot).toBeFalse();
      expect(player.attack.releaseQueued).toBeTrue();
    });
  });
});
