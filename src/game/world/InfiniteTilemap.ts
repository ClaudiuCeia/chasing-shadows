import {
  createTileData,
  createTileCornerHeights,
  getTileSurfaceElevation,
  normalizeTileData,
  type TileData,
  type TileCornerHeights,
  type TileKind,
  type TileSurfaceVariant,
} from "./tile-types.ts";
import { generateTerrainTile } from "./TerrainGenerator.ts";

export type TileDelta = {
  x: number;
  y: number;
  kind: TileKind;
  elevation?: number;
  blocking?: boolean;
  occluder?: boolean;
  corners?: Partial<TileCornerHeights>;
  surfaceVariant?: TileSurfaceVariant;
};

export type InfiniteTilemapOptions = {
  seed: number;
  chunkSize: number;
};

export type ChunkData = {
  chunkX: number;
  chunkY: number;
  tiles: TileData[];
};

const tileKey = (x: number, y: number): string => `${x}:${y}`;
const chunkKey = (x: number, y: number): string => `${x}:${y}`;

export class InfiniteTilemap {
  private readonly seed: number;
  private readonly chunkSize: number;
  private readonly chunkCache = new Map<string, ChunkData>();
  private readonly deltas = new Map<string, TileData>();

  public constructor(options: InfiniteTilemapOptions) {
    this.seed = options.seed;
    this.chunkSize = options.chunkSize;
  }

  public getSeed(): number {
    return this.seed;
  }

  public getChunkSize(): number {
    return this.chunkSize;
  }

  public getTile(worldX: number, worldY: number): TileData {
    const dx = Math.floor(worldX);
    const dy = Math.floor(worldY);
    const delta = this.deltas.get(tileKey(dx, dy));
    if (delta) {
      return delta;
    }

    const chunkX = Math.floor(dx / this.chunkSize);
    const chunkY = Math.floor(dy / this.chunkSize);
    const chunk = this.getChunk(chunkX, chunkY);

    const localX = ((dx % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localY = ((dy % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const index = localY * this.chunkSize + localX;
    return chunk.tiles[index] ?? createTileData("regolith");
  }

  public setTile(worldX: number, worldY: number, kind: TileKind): void {
    const dx = Math.floor(worldX);
    const dy = Math.floor(worldY);
    this.deltas.set(tileKey(dx, dy), createTileData(kind));
  }

  public setTileData(worldX: number, worldY: number, tile: TileData): void {
    const dx = Math.floor(worldX);
    const dy = Math.floor(worldY);
    this.deltas.set(tileKey(dx, dy), normalizeTileData(tile));
  }

  public getElevationAt(worldX: number, worldY: number): number {
    const tileX = Math.round(worldX);
    const tileY = Math.round(worldY);
    const tile = this.getTile(tileX, tileY);
    const localX = worldX - tileX + 0.5;
    const localY = worldY - tileY + 0.5;
    return getTileSurfaceElevation(tile, localX, localY);
  }

  public getChunk(chunkX: number, chunkY: number): ChunkData {
    const key = chunkKey(chunkX, chunkY);
    const existing = this.chunkCache.get(key);
    if (existing) {
      return existing;
    }

    const tiles: TileData[] = [];
    for (let y = 0; y < this.chunkSize; y++) {
      for (let x = 0; x < this.chunkSize; x++) {
        const worldX = chunkX * this.chunkSize + x;
        const worldY = chunkY * this.chunkSize + y;
        tiles.push(generateTerrainTile(worldX, worldY, this.seed));
      }
    }

    const chunk: ChunkData = { chunkX, chunkY, tiles };
    this.chunkCache.set(key, chunk);
    return chunk;
  }

  public serializeDeltas(): TileDelta[] {
    const result: TileDelta[] = [];
    for (const [key, tile] of this.deltas.entries()) {
      const [xs, ys] = key.split(":");
      result.push({
        x: Number(xs),
        y: Number(ys),
        kind: tile.kind,
        elevation: tile.elevation,
        blocking: tile.blocking,
        occluder: tile.occluder,
        corners: createTileCornerHeights(tile.corners, tile.elevation),
        surfaceVariant: tile.surfaceVariant,
      });
    }
    return result;
  }

  public applyDeltas(deltas: readonly TileDelta[]): void {
    for (const delta of deltas) {
      const base = createTileData(delta.kind);
      this.setTileData(delta.x, delta.y, {
        kind: delta.kind,
        blocking: delta.blocking ?? base.blocking,
        elevation: delta.elevation ?? base.elevation,
        occluder: delta.occluder ?? base.occluder,
        corners: createTileCornerHeights(delta.corners ?? base.corners, delta.elevation ?? base.elevation),
        surfaceVariant: delta.surfaceVariant ?? base.surfaceVariant,
      });
    }
  }
}
