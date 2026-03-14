import { describe, expect, test } from "bun:test";
import {
  MAX_TERRAIN_ELEVATION,
  generateTerrainChunk,
  generateTerrainTile,
} from "./TerrainGenerator.ts";

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

  test("chunk generation matches per-tile sampling", () => {
    const seed = 412;
    const chunkSize = 8;
    const chunkX = -2;
    const chunkY = 3;
    const tiles = generateTerrainChunk(chunkX, chunkY, chunkSize, seed);

    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const worldX = chunkX * chunkSize + x;
        const worldY = chunkY * chunkSize + y;
        expect(tiles[y * chunkSize + x]).toEqual(generateTerrainTile(worldX, worldY, seed));
      }
    }
  });

  test("builds varied terrain without cliff edges", () => {
    let singleStepEdges = 0;
    let flatEdges = 0;
    let steepEdges = 0;
    let slopedTiles = 0;
    const elevations = new Set<number>();

    for (let y = -20; y <= 20; y++) {
      for (let x = -20; x <= 20; x++) {
        const tile = generateTerrainTile(x, y, 321);
        const elevation = tile.elevation;
        elevations.add(elevation);
        const eastDelta = Math.abs(generateTerrainTile(x + 1, y, 321).elevation - elevation);
        const southDelta = Math.abs(generateTerrainTile(x, y + 1, 321).elevation - elevation);

        const isSloped =
          tile.corners.northWest !== tile.corners.northEast ||
          tile.corners.northEast !== tile.corners.southEast ||
          tile.corners.southEast !== tile.corners.southWest;

        if (isSloped) {
          slopedTiles++;
        }

        if (eastDelta === 0) {
          flatEdges++;
        } else if (eastDelta === 1) {
          singleStepEdges++;
        } else if (eastDelta > 1) {
          steepEdges++;
        }

        if (southDelta === 0) {
          flatEdges++;
        } else if (southDelta === 1) {
          singleStepEdges++;
        } else if (southDelta > 1) {
          steepEdges++;
        }
      }
    }

    expect(steepEdges).toBe(0);
    expect(singleStepEdges).toBeGreaterThan(150);
    expect(flatEdges).toBeGreaterThan(300);
    expect(slopedTiles).toBeGreaterThan(100);
    expect(elevations.size).toBeGreaterThan(3);
  });
});
