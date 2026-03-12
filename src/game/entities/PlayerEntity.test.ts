import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { TilemapStateComponent } from "../components/TilemapStateComponent.ts";
import { PlayerHitColliderEntity } from "./PlayerHitColliderEntity.ts";
import { PlayerEntity } from "./PlayerEntity.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("PlayerEntity", () => {
  test("updates tile position and hit collider from its own update", () => {
    const tilemap = new TilemapStateComponent({ seed: 123, chunkSize: 16 });
    const player = new PlayerEntity(new Vector2D(2, 3), 4, 8);
    player.bindTilemap(tilemap);
    player.awake();

    player.update(1 / 60);

    const bounds = player.hitCollider.bbox();
    expect(player.tilePosition.x).toBeCloseTo(2, 5);
    expect(player.tilePosition.y).toBeCloseTo(3, 5);
    expect(player.tilePosition.z).toBeCloseTo(tilemap.getElevationAt(2, 3), 5);
    expect(bounds.x).toBeCloseTo(2 - bounds.width / 2, 5);
    expect(bounds.y).toBeCloseTo(3 - bounds.height / 2, 5);
    expect(player.hitCollider.bodyHeight).toBeCloseTo(PlayerHitColliderEntity.standingHeight, 5);
  });

  test("updates hit collider posture when crouched", () => {
    const tilemap = new TilemapStateComponent({ seed: 123, chunkSize: 16 });
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.bindTilemap(tilemap);
    player.awake();

    player.update(1 / 60);
    const standingBounds = player.hitCollider.bbox();

    player.getComponent(MovementIntentComponent).setIntent(0, 0, false, true);
    player.update(1 / 60);

    const crouchedBounds = player.hitCollider.bbox();
    expect(crouchedBounds.width).toBeGreaterThan(standingBounds.width);
    expect(player.hitCollider.bodyHeight).toBeLessThan(PlayerHitColliderEntity.standingHeight);
  });
});
