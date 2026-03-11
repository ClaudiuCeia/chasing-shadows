import { describe, expect, test } from "bun:test";
import { InfiniteTilemap } from "./InfiniteTilemap.ts";
import { createTileCornerHeights, createTileData } from "./tile-types.ts";

describe("InfiniteTilemap", () => {
  test("produces deterministic tiles for the same seed", () => {
    const a = new InfiniteTilemap({ seed: 42, chunkSize: 16 });
    const b = new InfiniteTilemap({ seed: 42, chunkSize: 16 });

    expect(a.getTile(10, 22)).toEqual(b.getTile(10, 22));
    expect(a.getTile(-7, 99)).toEqual(b.getTile(-7, 99));
  });

  test("supports negative world coordinates", () => {
    const map = new InfiniteTilemap({ seed: 123, chunkSize: 16 });
    const tile = map.getTile(-1, -1);
    expect(tile.kind).toBeString();
  });

  test("applies and serializes tile deltas", () => {
    const map = new InfiniteTilemap({ seed: 5, chunkSize: 16 });
    map.setTileData(0, 0, {
      ...createTileData("shelter"),
      elevation: 2,
      occluder: true,
      corners: createTileCornerHeights({ northWest: 1, northEast: 2, southEast: 2, southWest: 1 }),
    });

    const deltas = map.serializeDeltas();
    const shelter = createTileData("shelter");
    expect(deltas).toContainEqual({
      x: 0,
      y: 0,
      kind: "shelter",
      elevation: 2,
      blocking: shelter.blocking,
      occluder: true,
      corners: { northWest: 1, northEast: 2, southEast: 2, southWest: 1 },
    });

    const restored = new InfiniteTilemap({ seed: 5, chunkSize: 16 });
    restored.applyDeltas(deltas);

    expect(restored.getTile(0, 0).kind).toBe("shelter");
    expect(restored.getTile(0, 0).corners).toEqual({ northWest: 1, northEast: 2, southEast: 2, southWest: 1 });
  });

  test("interpolates surface elevation across ramp tiles", () => {
    const map = new InfiniteTilemap({ seed: 5, chunkSize: 16 });
    map.setTileData(0, 0, {
      ...createTileData("regolith"),
      elevation: 2,
      occluder: true,
      corners: createTileCornerHeights({ northWest: 1, northEast: 2, southEast: 2, southWest: 1 }),
    });

    expect(map.getElevationAt(-0.45, 0)).toBeCloseTo(1.05, 2);
    expect(map.getElevationAt(0.45, 0)).toBeCloseTo(1.95, 2);
  });
});
