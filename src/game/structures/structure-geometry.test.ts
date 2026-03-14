import { describe, expect, test } from "bun:test";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { normalizeTileData } from "../world/tile-types.ts";
import { DEFAULT_POC_STRUCTURE_BLUEPRINT } from "./structure-blueprints.ts";
import {
  findStructurePlacementNear,
  getStructureBaseElevationAt,
  getStructureBounds,
  getStructureWalls,
} from "./structure-geometry.ts";
import { StructureRotation } from "./structure-types.ts";

const createFlatTile = (elevation: number) =>
  normalizeTileData({
    kind: "regolith",
    blocking: false,
    elevation,
    occluder: elevation > 0,
    corners: elevation,
  });

describe("structure-geometry", () => {
  test("validates a flat footprint at a shared elevation", () => {
    const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });

    for (let y = 8; y < 13; y++) {
      for (let x = 8; x < 13; x++) {
        map.setTileData(x, y, createFlatTile(2));
      }
    }

    expect(
      getStructureBaseElevationAt(
        map,
        DEFAULT_POC_STRUCTURE_BLUEPRINT,
        8,
        8,
        StructureRotation.North,
      ),
    ).toBe(2);
  });

  test("rejects sloped or mismatched footprint tiles", () => {
    const map = new InfiniteTilemap({ seed: 2, chunkSize: 16 });

    for (let y = 4; y < 9; y++) {
      for (let x = 4; x < 9; x++) {
        map.setTileData(x, y, createFlatTile(1));
      }
    }

    map.setTileData(
      6,
      6,
      normalizeTileData({
        kind: "regolith",
        blocking: false,
        elevation: 1,
        occluder: true,
        corners: { northWest: 1, northEast: 1, southEast: 2, southWest: 1 },
      }),
    );

    expect(
      getStructureBaseElevationAt(
        map,
        DEFAULT_POC_STRUCTURE_BLUEPRINT,
        4,
        4,
        StructureRotation.North,
      ),
    ).toBeNull();
  });

  test("finds the nearest flat placement and rotates walls", () => {
    const map = new InfiniteTilemap({ seed: 3, chunkSize: 16 });

    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        map.setTileData(x, y, createFlatTile(0));
      }
    }

    const placement = findStructurePlacementNear(map, 10, 10, DEFAULT_POC_STRUCTURE_BLUEPRINT, {
      minRadius: 0,
      maxRadius: 10,
      rotations: [StructureRotation.East],
    });
    expect(placement).not.toBeNull();

    const structure = placement!;
    const bounds = getStructureBounds(DEFAULT_POC_STRUCTURE_BLUEPRINT, structure);
    expect(bounds).toEqual({
      minX: structure.originX,
      minY: structure.originY,
      maxX: structure.originX + 4,
      maxY: structure.originY + 4,
    });

    const walls = getStructureWalls(DEFAULT_POC_STRUCTURE_BLUEPRINT, structure);
    expect(walls.some((wall) => wall.type === "door" && wall.side === "west")).toBe(true);
    expect(
      walls.some(
        (wall) => wall.type === "door" && wall.side === "west" && wall.anchorX === wall.x - 0.5,
      ),
    ).toBe(true);
  });
});
