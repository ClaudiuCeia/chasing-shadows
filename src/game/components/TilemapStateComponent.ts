import { Component } from "@claudiu-ceia/tick";
import {
  InfiniteTilemap,
  type ChunkData,
  type InfiniteTilemapOptions,
  type TileDelta,
} from "../world/InfiniteTilemap.ts";
import type { TileData, TileKind } from "../world/tile-types.ts";

export class TilemapStateComponent extends Component {
  private readonly options: InfiniteTilemapOptions;
  public map: InfiniteTilemap;

  public constructor(options: InfiniteTilemapOptions) {
    super();
    this.options = options;
    this.map = new InfiniteTilemap(options);
  }

  public getSeed(): number {
    return this.options.seed;
  }

  public getChunkSize(): number {
    return this.options.chunkSize;
  }

  public getTile(worldX: number, worldY: number): TileData {
    return this.map.getTile(worldX, worldY);
  }

  public setTile(worldX: number, worldY: number, kind: TileKind): void {
    this.map.setTile(worldX, worldY, kind);
  }

  public setTileData(worldX: number, worldY: number, tile: TileData): void {
    this.map.setTileData(worldX, worldY, tile);
  }

  public getElevationAt(worldX: number, worldY: number): number {
    return this.map.getElevationAt(worldX, worldY);
  }

  public getChunk(chunkX: number, chunkY: number): ChunkData {
    return this.map.getChunk(chunkX, chunkY);
  }

  public serializeDeltas(): TileDelta[] {
    return this.map.serializeDeltas();
  }

  public applyDeltas(deltas: readonly TileDelta[]): void {
    this.map.applyDeltas(deltas);
  }
}
