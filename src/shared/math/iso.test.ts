import { describe, expect, test } from "bun:test";
import { Vector2D } from "@claudiu-ceia/tick";
import { isoToWorld, worldToIso } from "./iso.ts";

const CONFIG = { tileWidth: 64, tileHeight: 32 };

describe("iso projection", () => {
  test("projects tile axes to isometric space", () => {
    expect(worldToIso(new Vector2D(1, 0), CONFIG)).toEqual(new Vector2D(32, 16));
    expect(worldToIso(new Vector2D(0, 1), CONFIG)).toEqual(new Vector2D(-32, 16));
  });

  test("round-trips world coordinates", () => {
    const world = new Vector2D(12.25, -7.75);
    const iso = worldToIso(world, CONFIG);
    const restored = isoToWorld(iso, CONFIG);

    expect(restored.x).toBeCloseTo(world.x, 8);
    expect(restored.y).toBeCloseTo(world.y, 8);
  });
});
