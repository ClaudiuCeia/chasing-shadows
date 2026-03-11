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

  test("heavily favors single-step terrain transitions", () => {
    let singleStepEdges = 0;
    let steepEdges = 0;
    let slopedTiles = 0;

    for (let y = -24; y <= 24; y++) {
      for (let x = -24; x <= 24; x++) {
        const tile = generateTerrainTile(x, y, 321);
        const elevation = tile.elevation;
        const eastDelta = Math.abs(generateTerrainTile(x + 1, y, 321).elevation - elevation);
        const southDelta = Math.abs(generateTerrainTile(x, y + 1, 321).elevation - elevation);

        const isSloped =
          tile.corners.northWest !== tile.corners.northEast ||
          tile.corners.northEast !== tile.corners.southEast ||
          tile.corners.southEast !== tile.corners.southWest;

        if (isSloped) {
          slopedTiles++;
        }

        if (eastDelta === 1) {
          singleStepEdges++;
        } else if (eastDelta > 1) {
          steepEdges++;
        }

        if (southDelta === 1) {
          singleStepEdges++;
        } else if (southDelta > 1) {
          steepEdges++;
        }
      }
    }

    expect(singleStepEdges).toBeGreaterThan(steepEdges * 3);
    expect(slopedTiles).toBeGreaterThan(100);
  });
});
