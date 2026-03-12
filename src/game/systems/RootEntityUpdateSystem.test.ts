import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D, World } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { PlayerHitColliderEntity } from "../entities/PlayerHitColliderEntity.ts";
import { RootEntityUpdateSystem } from "./RootEntityUpdateSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("RootEntityUpdateSystem", () => {
  test("propagates root updates into player child colliders", () => {
    const world = new World();
    const player = new PlayerEntity(new Vector2D(3, 4), 4, 8);
    player.awake();
    world.addSystem(new RootEntityUpdateSystem([player]));

    world.step(1 / 60);

    const bounds = player.hitCollider.bbox();
    expect(bounds.x).toBeCloseTo(3 - bounds.width / 2, 5);
    expect(bounds.y).toBeCloseTo(4 - bounds.height / 2, 5);
    expect(player.hitCollider.bodyHeight).toBeCloseTo(PlayerHitColliderEntity.standingHeight, 5);
  });

  test("lets hit collider update itself from crouch posture", () => {
    const world = new World();
    const player = new PlayerEntity(new Vector2D(0, 0), 4, 8);
    player.awake();
    world.addSystem(new RootEntityUpdateSystem([player]));

    world.step(1 / 60);
    const standingBounds = player.hitCollider.bbox();

    player.getComponent(MovementIntentComponent).setIntent(0, 0, false, true);
    world.step(1 / 60);

    const crouchedBounds = player.hitCollider.bbox();
    expect(crouchedBounds.width).toBeGreaterThan(standingBounds.width);
    expect(player.hitCollider.bodyHeight).toBeLessThan(PlayerHitColliderEntity.standingHeight);
  });
});
