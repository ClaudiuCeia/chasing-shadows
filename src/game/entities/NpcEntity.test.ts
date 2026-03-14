import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { TilemapStateComponent } from "../components/TilemapStateComponent.ts";
import { NpcEntity } from "./NpcEntity.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("NpcEntity", () => {
  test("updates tile position and ray origin from its own update", () => {
    const tilemap = new TilemapStateComponent({ seed: 123, chunkSize: 16 });
    const npc = new NpcEntity(new Vector2D(2, 3), 99);
    npc.bindTilemap(tilemap.map);
    npc.awake();

    npc.update(1 / 60);

    expect(npc.tilePosition.x).toBeCloseTo(2, 5);
    expect(npc.tilePosition.y).toBeCloseTo(3, 5);
    expect(npc.tilePosition.z).toBeCloseTo(tilemap.getElevationAt(2, 3), 5);
    expect(npc.rayEmitter.originHeight).toBeCloseTo(npc.hitCollider.bodyHeight, 5);
  });
});
