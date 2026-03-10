import { describe, expect, test } from "bun:test";
import { InfiniteTilemap } from "./InfiniteTilemap.ts";

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
    map.setTile(0, 0, "shelter");

    const deltas = map.serializeDeltas();
    expect(deltas).toContainEqual({ x: 0, y: 0, kind: "shelter" });

    const restored = new InfiniteTilemap({ seed: 5, chunkSize: 16 });
    restored.applyDeltas(deltas);

    expect(restored.getTile(0, 0).kind).toBe("shelter");
  });
});
