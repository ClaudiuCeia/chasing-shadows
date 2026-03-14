import type { StructureBlueprint, StructureWallSide, StructureWallType } from "./structure-types.ts";

const createFilledMask = (width: number, height: number): boolean[] =>
  Array.from({ length: width * height }, () => true);

const classifyWall = (
  side: StructureWallSide,
  x: number,
  y: number,
  width: number,
  height: number,
  doorSide: StructureWallSide,
): StructureWallType => {
  const middleX = Math.floor(width / 2);
  const middleY = Math.floor(height / 2);

  switch (side) {
    case "north":
    case "south":
      if (x === middleX) {
        return side === doorSide ? "door" : "window";
      }
      return "solid";
    case "east":
    case "west":
      if (y === middleY) {
        return side === doorSide ? "door" : "window";
      }
      return "solid";
  }
};

const createPerimeterWalls = (
  width: number,
  height: number,
  doorSide: StructureWallSide,
): StructureBlueprint["walls"] => {
  const walls: StructureBlueprint["walls"] = [];

  for (let x = 0; x < width; x++) {
    walls.push({ x, y: 0, side: "north", type: classifyWall("north", x, 0, width, height, doorSide) });
    walls.push({
      x,
      y: height - 1,
      side: "south",
      type: classifyWall("south", x, height - 1, width, height, doorSide),
    });
  }

  for (let y = 0; y < height; y++) {
    walls.push({ x: 0, y, side: "west", type: classifyWall("west", 0, y, width, height, doorSide) });
    walls.push({
      x: width - 1,
      y,
      side: "east",
      type: classifyWall("east", width - 1, y, width, height, doorSide),
    });
  }

  return walls;
};

const createCuboidBlueprint = (id: string, width: number, height: number, doorSide: StructureWallSide): StructureBlueprint => ({
  id,
  width,
  height,
  floorMask: createFilledMask(width, height),
  roofMask: createFilledMask(width, height),
  walls: createPerimeterWalls(width, height, doorSide),
});

export const POC_STRUCTURE_BLUEPRINTS: readonly StructureBlueprint[] = [
  createCuboidBlueprint("poc-shelter-5x5", 5, 5, "south"),
];

const blueprintById = new Map(POC_STRUCTURE_BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint]));

export const hasStructureBlueprintId = (id: string): boolean => blueprintById.has(id);

export const getStructureBlueprintById = (id: string): StructureBlueprint => {
  const blueprint = blueprintById.get(id);
  if (!blueprint) {
    throw new Error(`Unknown structure blueprint: ${id}`);
  }

  return blueprint;
};

export const DEFAULT_POC_STRUCTURE_BLUEPRINT = POC_STRUCTURE_BLUEPRINTS[0]!;
