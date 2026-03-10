import { describe, expect, test } from "bun:test";
import { MAX_TERRAIN_ELEVATION, generateTerrainTile } from "./TerrainGenerator.ts";

describe("TerrainGenerator", () => {
  test("is deterministic for a given seed and coordinate", () => {
    const a = generateTerrainTile(128, -43, 777);
    const b = generateTerrainTile(128, -43, 777);
    expect(a).toEqual(b);
  });

  test("keeps elevation inside allowed range", () => {
    for (let y = -64; y <= 64; y += 4) {
      for (let x = -64; x <= 64; x += 4) {
        const tile = generateTerrainTile(x, y, 1234);
        expect(tile.elevation).toBeGreaterThanOrEqual(0);
        expect(tile.elevation).toBeLessThanOrEqual(MAX_TERRAIN_ELEVATION);
      }
    }
  });

  test("does not depend on chunk-local coordinates", () => {
    const seed = 99;
    const edgeA = generateTerrainTile(15, 15, seed);
    const edgeB = generateTerrainTile(16, 15, seed);
    const edgeC = generateTerrainTile(15, 16, seed);

    expect(edgeA).toBeDefined();
    expect(edgeB).toBeDefined();
    expect(edgeC).toBeDefined();
    expect(generateTerrainTile(16, 15, seed)).toEqual(edgeB);
    expect(generateTerrainTile(15, 16, seed)).toEqual(edgeC);
  });
});
