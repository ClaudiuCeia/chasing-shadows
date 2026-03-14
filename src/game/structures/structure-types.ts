export enum StructureRotation {
  North = 0,
  East = 1,
  South = 2,
  West = 3,
}

export type StructureWallSide = "north" | "east" | "south" | "west";
export type StructureWallType = "solid" | "window" | "door";

export type StructureBlueprint = {
  id: string;
  width: number;
  height: number;
  floorMask: boolean[];
  roofMask: boolean[];
  walls: Array<{
    x: number;
    y: number;
    side: StructureWallSide;
    type: StructureWallType;
  }>;
};

export type StructureInstance = {
  blueprintId: string;
  originX: number;
  originY: number;
  baseZ: number;
  rotation: StructureRotation;
};

export type StructureMaskTile = {
  x: number;
  y: number;
};

export type StructureWallSegment = {
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  side: StructureWallSide;
  type: StructureWallType;
};

export type StructureBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export const STRUCTURE_ROTATIONS = [
  StructureRotation.North,
  StructureRotation.East,
  StructureRotation.South,
  StructureRotation.West,
] as const;

export const STRUCTURE_WALL_SIDES = ["north", "east", "south", "west"] as const satisfies readonly StructureWallSide[];

export const STRUCTURE_WALL_TYPES = ["solid", "window", "door"] as const satisfies readonly StructureWallType[];
