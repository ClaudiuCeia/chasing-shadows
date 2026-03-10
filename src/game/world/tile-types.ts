export type TileKind = "regolith" | "rock" | "scrap" | "shelter";

export type TileData = {
  kind: TileKind;
  blocking: boolean;
};

export const isTileBlocking = (tile: TileData): boolean => tile.blocking;
