import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { GAME_CONFIG } from "../config/game-config.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { UiStateEntity } from "../entities/UiStateEntity.ts";
import { getWeaponSpreadDegrees } from "../items/item-catalog.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { CombatRaycastSystem } from "./CombatRaycastSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("CombatRaycastSystem", () => {
  test("casts horizontal fire-at-will rays when no target is hovered", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 99, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      uiState.awake();
      player.bindTilemap({ getElevationAt: (x: number, y: number) => map.getElevationAt(x, y) } as never);
      player.awake();
      player.update(1 / 60);
      player.transform.setRotation(0);
      player.inventory.setEquipmentSlot("secondaryWeapon", { itemId: "pistol", count: 1 });
      player.inventory.setWeaponAmmoSlot("secondaryWeaponAmmo", { itemId: "pistol-ammo", count: 8 });
      player.inventory.setActiveSlot("secondary");

      const system = new CombatRaycastSystem(map, player, runtime);
      system.awake();
      system.update();

      expect(player.weaponRaycast.mode).toBe("fire-at-will");
      expect(player.weaponRaycast.rays.length).toBe(1);
      const ray = player.weaponRaycast.rays[0]!;
      expect(Math.abs(ray.endPoint.z - ray.origin.z)).toBeLessThan(0.05);
      expect(ray.direction.x).toBeGreaterThan(0.9);
    });
  });

  test("casts pitched targeted rays toward the hovered target point", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 99, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      uiState.awake();
      player.bindTilemap({ getElevationAt: (x: number, y: number) => map.getElevationAt(x, y) } as never);
      player.awake();
      player.update(1 / 60);
      player.inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
      player.inventory.setWeaponAmmoSlot("mainWeaponAmmo", { itemId: "shotgun-ammo", count: 8 });
      player.inventory.setActiveSlot("primary");
      player.weaponRaycast.targetPoint = {
        x: 5,
        y: 0,
        z: player.tilePosition.z + player.hitCollider.bodyHeight + 2,
      };

      const system = new CombatRaycastSystem(map, player, runtime);
      system.awake();
      system.update();

      expect(player.weaponRaycast.mode).toBe("targeted");
      expect(player.weaponRaycast.rays.length).toBe(Math.max(1, Math.round(getWeaponSpreadDegrees("shotgun"))));
      const middleRay = player.weaponRaycast.rays[Math.floor(player.weaponRaycast.rays.length / 2)]!;
      expect(middleRay.endPoint.z).toBeGreaterThan(middleRay.origin.z);
      expect(middleRay.distance).toBeGreaterThan(0);

      const uniqueRoundedHeights = new Set(player.weaponRaycast.rays.map((ray) => ray.endPoint.z.toFixed(2)));
      expect(uniqueRoundedHeights.size).toBeGreaterThan(1);
    });
  });

  test("keeps the same jittered combat rays between frames until a new shot occurs", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 99, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);

      uiState.awake();
      player.bindTilemap({ getElevationAt: (x: number, y: number) => map.getElevationAt(x, y) } as never);
      player.awake();
      player.update(1 / 60);
      player.inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
      player.inventory.setWeaponAmmoSlot("mainWeaponAmmo", { itemId: "shotgun-ammo", count: 8 });
      player.inventory.setActiveSlot("primary");
      player.weaponRaycast.targetPoint = {
        x: 5,
        y: 0,
        z: player.tilePosition.z + player.hitCollider.bodyHeight + 2,
      };

      const system = new CombatRaycastSystem(map, player, runtime);
      system.awake();

      player.attack.shotCounter = 1;
      system.update();
      const firstSnapshot = player.weaponRaycast.rays.map((ray) => ({
        x: ray.endPoint.x,
        y: ray.endPoint.y,
        z: ray.endPoint.z,
      }));

      system.update();
      const secondSnapshot = player.weaponRaycast.rays.map((ray) => ({
        x: ray.endPoint.x,
        y: ray.endPoint.y,
        z: ray.endPoint.z,
      }));

      expect(secondSnapshot).toEqual(firstSnapshot);
    });
  });
});
