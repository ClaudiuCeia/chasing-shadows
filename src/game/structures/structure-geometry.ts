import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { isTileFlat } from "../world/tile-types.ts";
import {
  StructureRotation,
  type StructureBlueprint,
  type StructureBounds,
  type StructureInstance,
  type StructureMaskTile,
  type StructureWallSegment,
  type StructureWallSide,
} from "./structure-types.ts";

const tileKey = (x: number, y: number): string => `${x}:${y}`;

const maskIndex = (width: number, x: number, y: number): number => y * width + x;

const rotateSide = (side: StructureWallSide, rotation: StructureRotation): StructureWallSide => {
  const order: StructureWallSide[] = ["north", "east", "south", "west"];
  const index = order.indexOf(side);
  return order[(index + rotation) % order.length] ?? side;
};

const getWallAnchor = (x: number, y: number, side: StructureWallSide): { anchorX: number; anchorY: number } => {
  switch (side) {
    case "north":
      return { anchorX: x, anchorY: y - 0.5 };
    case "east":
      return { anchorX: x + 0.5, anchorY: y };
    case "south":
      return { anchorX: x, anchorY: y + 0.5 };
    case "west":
      return { anchorX: x - 0.5, anchorY: y };
  }
};

export const getRotatedFootprintSize = (
  blueprint: StructureBlueprint,
  rotation: StructureRotation,
): { width: number; height: number } => {
  if (rotation === StructureRotation.East || rotation === StructureRotation.West) {
    return { width: blueprint.height, height: blueprint.width };
  }

  return { width: blueprint.width, height: blueprint.height };
};

export const rotateStructureTile = (
  x: number,
  y: number,
  blueprint: StructureBlueprint,
  rotation: StructureRotation,
): StructureMaskTile => {
  switch (rotation) {
    case StructureRotation.North:
      return { x, y };
    case StructureRotation.East:
      return { x: blueprint.height - 1 - y, y: x };
    case StructureRotation.South:
      return { x: blueprint.width - 1 - x, y: blueprint.height - 1 - y };
    case StructureRotation.West:
      return { x: y, y: blueprint.width - 1 - x };
  }
};

const collectMaskTiles = (
  blueprint: StructureBlueprint,
  mask: readonly boolean[],
  rotation: StructureRotation,
): StructureMaskTile[] => {
  const tiles: StructureMaskTile[] = [];

  for (let y = 0; y < blueprint.height; y++) {
    for (let x = 0; x < blueprint.width; x++) {
      if (!mask[maskIndex(blueprint.width, x, y)]) {
        continue;
      }

      tiles.push(rotateStructureTile(x, y, blueprint, rotation));
    }
  }

  return tiles;
};

export const getStructureFloorTiles = (
  blueprint: StructureBlueprint,
  instance: Pick<StructureInstance, "originX" | "originY" | "rotation">,
): StructureMaskTile[] =>
  collectMaskTiles(blueprint, blueprint.floorMask, instance.rotation).map((tile) => ({
    x: instance.originX + tile.x,
    y: instance.originY + tile.y,
  }));

export const getStructureRoofTiles = (
  blueprint: StructureBlueprint,
  instance: Pick<StructureInstance, "originX" | "originY" | "rotation">,
): StructureMaskTile[] =>
  collectMaskTiles(blueprint, blueprint.roofMask, instance.rotation).map((tile) => ({
    x: instance.originX + tile.x,
    y: instance.originY + tile.y,
  }));

export const getStructureWalls = (blueprint: StructureBlueprint, instance: StructureInstance): StructureWallSegment[] =>
  blueprint.walls.map((wall) => {
    const rotated = rotateStructureTile(wall.x, wall.y, blueprint, instance.rotation);
    const x = instance.originX + rotated.x;
    const y = instance.originY + rotated.y;
    const side = rotateSide(wall.side, instance.rotation);
    const anchor = getWallAnchor(x, y, side);
    return {
      x,
      y,
      anchorX: anchor.anchorX,
      anchorY: anchor.anchorY,
      side,
      type: wall.type,
    };
  });

export const getStructureOccupiedTiles = (blueprint: StructureBlueprint, instance: StructureInstance): StructureMaskTile[] => {
  const occupied = new Map<string, StructureMaskTile>();

  for (const tile of getStructureFloorTiles(blueprint, instance)) {
    occupied.set(tileKey(tile.x, tile.y), tile);
  }

  for (const tile of getStructureRoofTiles(blueprint, instance)) {
    occupied.set(tileKey(tile.x, tile.y), tile);
  }

  for (const wall of getStructureWalls(blueprint, instance)) {
    occupied.set(tileKey(wall.x, wall.y), { x: wall.x, y: wall.y });
  }

  return Array.from(occupied.values());
};

export const getStructureBounds = (blueprint: StructureBlueprint, instance: StructureInstance): StructureBounds => {
  const { width, height } = getRotatedFootprintSize(blueprint, instance.rotation);
  return {
    minX: instance.originX,
    minY: instance.originY,
    maxX: instance.originX + width - 1,
    maxY: instance.originY + height - 1,
  };
};

export const getStructureBaseElevationAt = (
  map: InfiniteTilemap,
  blueprint: StructureBlueprint,
  originX: number,
  originY: number,
  rotation: StructureRotation,
): number | null => {
  const instance: StructureInstance = {
    blueprintId: blueprint.id,
    originX,
    originY,
    baseZ: 0,
    rotation,
  };
  const occupied = getStructureOccupiedTiles(blueprint, instance);
  let baseElevation: number | null = null;

  for (const tileRef of occupied) {
    const tile = map.getTile(tileRef.x, tileRef.y);
    if (tile.blocking || !isTileFlat(tile)) {
      return null;
    }

    if (baseElevation === null) {
      baseElevation = tile.elevation;
      continue;
    }

    if (tile.elevation !== baseElevation) {
      return null;
    }
  }

  return baseElevation;
};

export const getTileCoordinateAtPoint = (x: number, y: number): StructureMaskTile => ({
  x: Math.floor(x + 0.5),
  y: Math.floor(y + 0.5),
});

export const isPointInsideStructure = (
  blueprint: StructureBlueprint,
  instance: StructureInstance,
  worldX: number,
  worldY: number,
  z: number,
  zTolerance = 0.75,
): boolean => {
  if (Math.abs(z - instance.baseZ) > zTolerance) {
    return false;
  }

  const tile = getTileCoordinateAtPoint(worldX, worldY);
  const floorTiles = getStructureFloorTiles(blueprint, instance);
  return floorTiles.some((entry) => entry.x === tile.x && entry.y === tile.y);
};

export const findStructurePlacementNear = (
  map: InfiniteTilemap,
  aroundX: number,
  aroundY: number,
  blueprint: StructureBlueprint,
  options: {
    minRadius?: number;
    maxRadius?: number;
    rotations?: readonly StructureRotation[];
  } = {},
): StructureInstance | null => {
  const minRadius = Math.max(0, Math.floor(options.minRadius ?? 6));
  const maxRadius = Math.max(minRadius, Math.floor(options.maxRadius ?? 48));
  const rotations = options.rotations ?? [
    StructureRotation.North,
    StructureRotation.East,
    StructureRotation.South,
    StructureRotation.West,
  ];

  for (let radius = minRadius; radius <= maxRadius; radius++) {
    for (let y = aroundY - radius; y <= aroundY + radius; y++) {
      for (let x = aroundX - radius; x <= aroundX + radius; x++) {
        if (Math.max(Math.abs(x - aroundX), Math.abs(y - aroundY)) !== radius) {
          continue;
        }

        for (const rotation of rotations) {
          const baseZ = getStructureBaseElevationAt(map, blueprint, x, y, rotation);
          if (baseZ === null) {
            continue;
          }

          return {
            blueprintId: blueprint.id,
            originX: x,
            originY: y,
            baseZ,
            rotation,
          };
        }
      }
    }
  }

  return null;
};
