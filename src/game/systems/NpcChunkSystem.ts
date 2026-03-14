import { EcsRuntime, SystemPhase, SystemTickMode, TransformComponent, Vector2D, type System } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { NpcEntity } from "../entities/NpcEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { hash2 } from "../../shared/math/hash.ts";
import { tileKey } from "../../shared/math/tile-key.ts";
import { isTileFlat } from "../world/tile-types.ts";

const NPC_SPAWN_SEED = 0x42f17c9d;
const NPC_ENTITY_SEED = 0x7a91d205;
const MIN_PLAYER_SPAWN_DISTANCE = 2;

export class NpcChunkSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly active = new Map<string, NpcEntity>();
  private initialized = false;
  private lastChunkX = 0;
  private lastChunkY = 0;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    private readonly chunkRadius: number,
    private readonly spawnChance: number,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    void runtime;
  }

  public awake(): void {}

  public update(): void {
    const chunkSize = this.map.getChunkSize();
    const position = this.player.getComponent(TransformComponent).transform.position;
    const chunkX = Math.floor(position.x / chunkSize);
    const chunkY = Math.floor(position.y / chunkSize);

    const movedChunk = chunkX !== this.lastChunkX || chunkY !== this.lastChunkY;
    if (!this.initialized || movedChunk) {
      this.initialized = true;
      this.lastChunkX = chunkX;
      this.lastChunkY = chunkY;
      this.refreshActiveWindow(chunkX, chunkY);
    }
  }

  public destroy(): void {
    for (const entity of this.active.values()) {
      entity.destroy();
    }
    this.active.clear();
  }

  private refreshActiveWindow(centerChunkX: number, centerChunkY: number): void {
    const chunkSize = this.map.getChunkSize();
    const desired = new Set<string>();
    const playerPosition = this.player.getComponent(TransformComponent).transform.position;

    for (let cy = centerChunkY - this.chunkRadius; cy <= centerChunkY + this.chunkRadius; cy++) {
      for (let cx = centerChunkX - this.chunkRadius; cx <= centerChunkX + this.chunkRadius; cx++) {
        this.map.getChunk(cx, cy);

        for (let localY = 0; localY < chunkSize; localY++) {
          for (let localX = 0; localX < chunkSize; localX++) {
            const worldX = cx * chunkSize + localX;
            const worldY = cy * chunkSize + localY;
            if (!this.shouldSpawnNpcAt(worldX, worldY)) {
              continue;
            }

            if (Math.hypot(worldX - playerPosition.x, worldY - playerPosition.y) < MIN_PLAYER_SPAWN_DISTANCE) {
              continue;
            }

            const key = tileKey(worldX, worldY);
            desired.add(key);

            const existing = this.active.get(key);
            if (existing) {
              continue;
            }

            const entity = new NpcEntity(new Vector2D(worldX, worldY), this.getEntitySeed(worldX, worldY));
            entity.bindTilemap(this.map);
            entity.awake();
            this.active.set(key, entity);
          }
        }
      }
    }

    for (const [key, entity] of this.active.entries()) {
      if (desired.has(key)) {
        continue;
      }

      entity.destroy();
      this.active.delete(key);
    }
  }

  private shouldSpawnNpcAt(worldX: number, worldY: number): boolean {
    const tile = this.map.getTile(worldX, worldY);
    if (tile.blocking || !isTileFlat(tile)) {
      return false;
    }

    return hash2(worldX, worldY, NPC_SPAWN_SEED ^ this.map.getSeed()) < this.spawnChance;
  }

  private getEntitySeed(worldX: number, worldY: number): number {
    return Math.floor(hash2(worldX, worldY, NPC_ENTITY_SEED ^ this.map.getSeed()) * 0x7fffffff) || 1;
  }
}
