import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { UiStateEntity } from "../entities/UiStateEntity.ts";
import { NpcEntity } from "../entities/NpcEntity.ts";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { TargetHoverSystem } from "./TargetHoverSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("TargetHoverSystem", () => {
  test("highlights the NPC under the mouse cursor and stores the target point", () => {
    const runtime = new EcsRuntime();
    const canvas = {
      width: 1280,
      height: 720,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    } as unknown as HTMLCanvasElement;

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 7, chunkSize: 16 });
      const uiState = new UiStateEntity();
      const player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);
      const nearNpc = new NpcEntity(new Vector2D(2, 0), 10);
      const farNpc = new NpcEntity(new Vector2D(4, 2), 11);
      const camera = new IsometricCameraEntity({ tileWidth: GAME_CONFIG.tileWidth, tileHeight: GAME_CONFIG.tileHeight }, GAME_CONFIG.elevationStepPixels);

      uiState.awake();
      player.bindTilemap({ getElevationAt: (x: number, y: number) => map.getElevationAt(x, y) } as never);
      nearNpc.bindTilemap(map);
      farNpc.bindTilemap(map);
      player.awake();
      nearNpc.awake();
      farNpc.awake();
      player.update(1 / 60);
      nearNpc.update(1 / 60);
      farNpc.update(1 / 60);
      camera.awake();

      const targetCanvasPoint = camera.toCanvasAt(
        nearNpc.transform.transform.position,
        nearNpc.tilePosition.z + nearNpc.targetable.aimHeight,
        new Vector2D(canvas.width, canvas.height),
      );
      uiState.pointerWorld.setResolved(new Vector2D(2, 0), targetCanvasPoint, map.getElevationAt(2, 0));

      const system = new TargetHoverSystem(camera, canvas, map, player, runtime);
      system.awake();
      system.update();

      expect(nearNpc.highlight.active).toBeTrue();
      expect(farNpc.highlight.active).toBeFalse();
      expect(player.weaponRaycast.hoveredTarget?.id).toBe(nearNpc.id);
      expect(player.weaponRaycast.targetPoint).not.toBeNull();
    });
  });
});
