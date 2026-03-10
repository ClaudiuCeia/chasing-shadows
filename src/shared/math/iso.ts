import { Vector2D } from "@claudiu-ceia/tick";

export type IsoConfig = {
  tileWidth: number;
  tileHeight: number;
};

export const worldToIso = (world: Vector2D, cfg: IsoConfig): Vector2D => {
  const halfWidth = cfg.tileWidth / 2;
  const halfHeight = cfg.tileHeight / 2;

  return new Vector2D((world.x - world.y) * halfWidth, (world.x + world.y) * halfHeight);
};

export const isoToWorld = (iso: Vector2D, cfg: IsoConfig): Vector2D => {
  const halfWidth = cfg.tileWidth / 2;
  const halfHeight = cfg.tileHeight / 2;

  const x = (iso.x / halfWidth + iso.y / halfHeight) / 2;
  const y = (iso.y / halfHeight - iso.x / halfWidth) / 2;

  return new Vector2D(x, y);
};
