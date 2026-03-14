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

      player.inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
      PlayerAttackSystem.syncFireModeFromInventory(player.attack, player.inventory);
      expect(player.attack.fireMode).toBe("semi");

      const system = new WorldPointerActionSystem(map, GAME_CONFIG.lootBoxInteractRange, runtime);
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
      expect(uiState.pointerWorld.mode).toBe("attack");

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

      player.inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
      PlayerAttackSystem.syncFireModeFromInventory(player.attack, player.inventory);

      const system = new WorldPointerActionSystem(map, GAME_CONFIG.lootBoxInteractRange, runtime);
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

  test("uses auto fire for ump5", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const worldState = new WorldStateEntity({ seed: 1, spawnChance: 0 });
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      uiState.awake();
      worldState.awake();
      player.awake();

      player.inventory.setEquipmentSlot("mainWeapon", { itemId: "ump5", count: 1 });

      const system = new WorldPointerActionSystem(map, GAME_CONFIG.lootBoxInteractRange, runtime);
      system.awake();

      uiState.pointerWorld.setResolved(new Vector2D(5, 0), new Vector2D(0, 0), map.getElevationAt(5, 0));
      uiState.pointerWorld.phase = "press";
      system.update();

      expect(player.attack.fireMode).toBe("auto");
      expect(player.attack.active).toBeTrue();
      expect(player.attack.looping).toBeTrue();
    });
  });

  test("does not attack when a non-weapon quick slot is active", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const worldState = new WorldStateEntity({ seed: 1, spawnChance: 0 });
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      uiState.awake();
      worldState.awake();
      player.awake();

      player.inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
      player.inventory.setActiveSlot("quick1");

      const system = new WorldPointerActionSystem(map, GAME_CONFIG.lootBoxInteractRange, runtime);
      system.awake();

      uiState.pointerWorld.setResolved(new Vector2D(5, 0), new Vector2D(0, 0), map.getElevationAt(5, 0));
      uiState.pointerWorld.phase = "press";
      system.update();

      expect(player.attack.active).toBeFalse();
      expect(uiState.pointerWorld.mode).toBeNull();
    });
  });

  test("attacks with the selected equipped weapon slot", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const worldState = new WorldStateEntity({ seed: 1, spawnChance: 0 });
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      uiState.awake();
      worldState.awake();
      player.awake();

      player.inventory.setEquipmentSlot("secondaryWeapon", { itemId: "pistol", count: 1 });
      player.inventory.setActiveSlot("secondary");

      const system = new WorldPointerActionSystem(map, GAME_CONFIG.lootBoxInteractRange, runtime);
      system.awake();

      uiState.pointerWorld.setResolved(new Vector2D(5, 0), new Vector2D(0, 0), map.getElevationAt(5, 0));
      uiState.pointerWorld.phase = "press";
      system.update();

      expect(player.attack.active).toBeTrue();
      expect(uiState.pointerWorld.mode).toBe("attack");
    });
  });

  test("does not open loot from outside interact range on click", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const worldState = new WorldStateEntity({ seed: 1, spawnChance: 0 });
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      worldState.lootField.setSlots(8, 0, [{ itemId: "body-armor", count: 1 }, ...Array.from({ length: 15 }, () => null)]);

      uiState.awake();
      worldState.awake();
      player.awake();

      const system = new WorldPointerActionSystem(map, GAME_CONFIG.lootBoxInteractRange, runtime);
      system.awake();

      uiState.pointerWorld.setResolved(new Vector2D(8, 0), new Vector2D(0, 0), map.getElevationAt(8, 0));
      uiState.pointerWorld.phase = "press";
      system.update();

      expect(uiState.lootUi.openSource).toBeNull();
      expect(uiState.modalState.activeModal).toBeNull();
    });
  });

  test("opens loot on click instead of press", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const worldState = new WorldStateEntity({ seed: 1, spawnChance: 0 });
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      worldState.lootField.setSlots(1, 0, [{ itemId: "body-armor", count: 1 }, ...Array.from({ length: 15 }, () => null)]);

      uiState.awake();
      worldState.awake();
      player.awake();

      const system = new WorldPointerActionSystem(map, GAME_CONFIG.lootBoxInteractRange, runtime);
      system.awake();

      uiState.pointerWorld.setResolved(new Vector2D(1, 0), new Vector2D(0, 0), map.getElevationAt(1, 0));
      uiState.pointerWorld.phase = "press";
      system.update();
      expect(uiState.lootUi.openSource).toBeNull();

      uiState.pointerWorld.phase = "click";
      system.update();
      expect(uiState.lootUi.openSource).toEqual({ kind: "tile-box", x: 1, y: 0 });
      expect(uiState.modalState.activeModal).toBe("inventory");
      expect(uiState.pointerWorld.mode).toBeNull();
    });
  });

  test("does not reopen or retarget loot while modal is open", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const worldState = new WorldStateEntity({ seed: 1, spawnChance: 0 });
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      worldState.lootField.setSlots(1, 0, [{ itemId: "body-armor", count: 1 }, ...Array.from({ length: 15 }, () => null)]);
      worldState.lootField.setSlots(0, 1, [{ itemId: "helmet", count: 1 }, ...Array.from({ length: 15 }, () => null)]);

      uiState.awake();
      worldState.awake();
      player.awake();

      const system = new WorldPointerActionSystem(map, GAME_CONFIG.lootBoxInteractRange, runtime);
      system.awake();

      uiState.lootUi.openTileBox(1, 0);
      uiState.modalState.open("inventory");

      uiState.pointerWorld.setResolved(new Vector2D(0, 1), new Vector2D(0, 0), map.getElevationAt(0, 1));
      uiState.pointerWorld.phase = "click";
      system.update();

      expect(uiState.lootUi.openSource).toEqual({ kind: "tile-box", x: 1, y: 0 });
      expect(uiState.modalState.activeModal).toBe("inventory");
      expect(uiState.pointerWorld.mode).toBeNull();
    });
  });
});
