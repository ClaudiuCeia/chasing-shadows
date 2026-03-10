export type TileKind = "regolith" | "rock" | "scrap" | "shelter";

export type TileData = {
  kind: TileKind;
  blocking: boolean;
  elevation: number;
  occluder: boolean;
};

export const isTileBlocking = (tile: TileData): boolean => tile.blocking;

export const createTileData = (kind: TileKind): TileData => {
  switch (kind) {
    case "rock":
      return { kind, blocking: false, elevation: 1, occluder: true };
    case "shelter":
      return { kind, blocking: false, elevation: 0, occluder: false };
    case "scrap":
      return { kind, blocking: false, elevation: 0, occluder: false };
    case "regolith":
      return { kind, blocking: false, elevation: 0, occluder: false };
  }
};
