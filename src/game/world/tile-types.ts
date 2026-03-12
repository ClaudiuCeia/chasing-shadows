import { clamp01 } from "../../shared/math/clamp.ts";

export const TILE_KIND_VALUES = ["regolith", "rock", "scrap", "shelter"] as const;
export type TileKind = "regolith" | "rock" | "scrap" | "shelter";

export const TILE_SURFACE_VARIANT_VALUES = ["neutral", "sun", "dark"] as const;
export type TileSurfaceVariant = "neutral" | "sun" | "dark";

export type TileCornerHeights = {
  northWest: number;
  northEast: number;
  southEast: number;
  southWest: number;
};

export type TileData = {
  kind: TileKind;
  blocking: boolean;
  elevation: number;
  occluder: boolean;
  corners: TileCornerHeights;
  surfaceVariant: TileSurfaceVariant;
};

export const createTileCornerHeights = (
  value: number | Partial<TileCornerHeights>,
  fallbackElevation?: number,
): TileCornerHeights => {
  if (typeof value === "number") {
    return {
      northWest: value,
      northEast: value,
      southEast: value,
      southWest: value,
    };
  }

  const fallback = fallbackElevation ?? 0;
  return {
    northWest: value.northWest ?? fallback,
    northEast: value.northEast ?? fallback,
    southEast: value.southEast ?? fallback,
    southWest: value.southWest ?? fallback,
  };
};

const getTileMaxElevation = (tile: TileData): number =>
  Math.max(tile.corners.northWest, tile.corners.northEast, tile.corners.southEast, tile.corners.southWest);

const getTileMinElevation = (tile: TileData): number =>
  Math.min(tile.corners.northWest, tile.corners.northEast, tile.corners.southEast, tile.corners.southWest);

export const getTileSlopeRange = (tile: TileData): number => getTileMaxElevation(tile) - getTileMinElevation(tile);

export const isTileFlat = (tile: TileData): boolean => getTileSlopeRange(tile) <= 0;

export const getTileSurfaceElevation = (tile: TileData, localX: number, localY: number): number => {
  const x = clamp01(localX);
  const y = clamp01(localY);
  const north = tile.corners.northWest * (1 - x) + tile.corners.northEast * x;
  const south = tile.corners.southWest * (1 - x) + tile.corners.southEast * x;
  return north * (1 - y) + south * y;
};

export const areTileDataEqual = (a: TileData, b: TileData): boolean =>
  a.kind === b.kind &&
  a.blocking === b.blocking &&
  a.elevation === b.elevation &&
  a.occluder === b.occluder &&
  a.surfaceVariant === b.surfaceVariant &&
  a.corners.northWest === b.corners.northWest &&
  a.corners.northEast === b.corners.northEast &&
  a.corners.southEast === b.corners.southEast &&
  a.corners.southWest === b.corners.southWest;

export const normalizeTileData = (tile: {
  kind: TileKind;
  blocking: boolean;
  elevation?: number;
  occluder?: boolean;
  corners: number | Partial<TileCornerHeights>;
  surfaceVariant?: TileSurfaceVariant;
}): TileData => {
  const corners = createTileCornerHeights(tile.corners, tile.elevation ?? 0);
  const elevation = Math.max(corners.northWest, corners.northEast, corners.southEast, corners.southWest);
  return {
    kind: tile.kind,
    blocking: tile.blocking,
    elevation,
    occluder: tile.occluder ?? elevation > 0,
    corners,
    surfaceVariant: tile.surfaceVariant ?? "neutral",
  };
};

export const createTileData = (kind: TileKind): TileData => {
  switch (kind) {
    case "rock": {
      return normalizeTileData({ kind, blocking: false, elevation: 1, occluder: true, corners: 1 });
    }
    case "shelter": {
      return normalizeTileData({ kind, blocking: false, elevation: 0, occluder: false, corners: 0 });
    }
    case "scrap": {
      return normalizeTileData({ kind, blocking: false, elevation: 0, occluder: false, corners: 0 });
    }
    case "regolith": {
      return normalizeTileData({ kind, blocking: false, elevation: 0, occluder: false, corners: 0 });
    }
  }
};
