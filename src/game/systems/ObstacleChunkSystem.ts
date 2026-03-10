import { SystemPhase, SystemTickMode, TransformComponent, Vector2D, type System } from "@claudiu-ceia/tick";
import { ObstacleEntity } from "../entities/ObstacleEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

const obstacleKey = (x: number, y: number): string => `${x}:${y}`;

export class ObstacleChunkSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly active = new Map<string, ObstacleEntity>();
  private initialized = false;
  private lastChunkX = 0;
  private lastChunkY = 0;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    private readonly chunkRadius: number,
  ) {}

  public update(): void {
    const chunkSize = this.map.getChunkSize();
    const playerPos = this.player.getComponent(TransformComponent).transform.position;
    const chunkX = Math.floor(playerPos.x / chunkSize);
    const chunkY = Math.floor(playerPos.y / chunkSize);

    if (this.initialized && chunkX === this.lastChunkX && chunkY === this.lastChunkY) {
      return;
    }

    this.initialized = true;
    this.lastChunkX = chunkX;
    this.lastChunkY = chunkY;

    const desired = new Set<string>();

    for (let cy = chunkY - this.chunkRadius; cy <= chunkY + this.chunkRadius; cy++) {
      for (let cx = chunkX - this.chunkRadius; cx <= chunkX + this.chunkRadius; cx++) {
        this.map.getChunk(cx, cy);

        for (let localY = 0; localY < chunkSize; localY++) {
          for (let localX = 0; localX < chunkSize; localX++) {
            const worldX = cx * chunkSize + localX;
            const worldY = cy * chunkSize + localY;

            const tile = this.map.getTile(worldX, worldY);
            if (!tile || !tile.blocking) continue;

            const key = obstacleKey(worldX, worldY);
            desired.add(key);

            if (this.active.has(key)) {
              continue;
            }

            const obstacle = new ObstacleEntity(new Vector2D(worldX, worldY));
            obstacle.awake();
            this.active.set(key, obstacle);
          }
        }
      }
    }

    for (const [key, obstacle] of this.active.entries()) {
      if (desired.has(key)) {
        continue;
      }
      obstacle.destroy();
      this.active.delete(key);
    }
  }

  public destroy(): void {
    for (const obstacle of this.active.values()) {
      obstacle.destroy();
    }
    this.active.clear();
  }
}
