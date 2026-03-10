import { hash2 } from "../../shared/math/hash.ts";
import type { TileData, TileKind } from "./tile-types.ts";

export type TileDelta = {
  x: number;
  y: number;
  kind: TileKind;
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

const tileFromNoise = (noise: number): TileData => {
  if (noise < 0.045) {
    return { kind: "rock", blocking: true };
  }

  if (noise < 0.11) {
    return { kind: "shelter", blocking: false };
  }

  if (noise < 0.25) {
    return { kind: "scrap", blocking: false };
  }

  return { kind: "regolith", blocking: false };
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
    return chunk.tiles[index] ?? { kind: "regolith", blocking: false };
  }

  public setTile(worldX: number, worldY: number, kind: TileKind): void {
    const dx = Math.floor(worldX);
    const dy = Math.floor(worldY);
    this.deltas.set(tileKey(dx, dy), { kind, blocking: kind === "rock" });
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
        const noise = hash2(worldX, worldY, this.seed);
        tiles.push(tileFromNoise(noise));
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
      });
    }
    return result;
  }

  public applyDeltas(deltas: readonly TileDelta[]): void {
    for (const delta of deltas) {
      this.setTile(delta.x, delta.y, delta.kind);
    }
  }
}
