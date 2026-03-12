import { EcsRuntime, SystemPhase, SystemTickMode, TransformComponent, type EntityQuery, type System } from "@claudiu-ceia/tick";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { LootBoxEntity } from "../entities/LootBoxEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { tileKey } from "../../shared/math/tile-key.ts";

export class LootBoxChunkSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly active = new Map<string, LootBoxEntity>();
  private initialized = false;
  private lastChunkX = 0;
  private lastChunkY = 0;
  private readonly runtime: EcsRuntime;
  private worldQuery: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    private readonly chunkRadius: number,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.worldQuery = this.runtime.registry.query().with(LootFieldComponent);
  }

  public update(): void {
    const lootField = this.worldQuery ? getSingletonComponent(this.worldQuery, LootFieldComponent) : null;
    if (!lootField) {
      return;
    }

    const chunkSize = this.map.getChunkSize();
    const position = this.player.getComponent(TransformComponent).transform.position;
    const chunkX = Math.floor(position.x / chunkSize);
    const chunkY = Math.floor(position.y / chunkSize);

    const movedChunk = chunkX !== this.lastChunkX || chunkY !== this.lastChunkY;
    if (!this.initialized || movedChunk) {
      this.initialized = true;
      this.lastChunkX = chunkX;
      this.lastChunkY = chunkY;
      this.refreshActiveWindow(chunkX, chunkY, lootField);
      return;
    }

    for (const [key, entity] of this.active.entries()) {
      const tile = entity.tile;
      entity.tile.z = this.map.getElevationAt(tile.x, tile.y);
      const box = lootField.getBoxAt(tile.x, tile.y, this.map);
      if (!box) {
        entity.destroy();
        this.active.delete(key);
        continue;
      }

      if (entity.sprite.spriteIndex !== box.spriteIndex) {
        entity.sprite.setSpriteIndex(box.spriteIndex);
      }
    }
  }

  public destroy(): void {
    for (const entity of this.active.values()) {
      entity.destroy();
    }
    this.active.clear();
  }

  private refreshActiveWindow(
    centerChunkX: number,
    centerChunkY: number,
    lootField: LootFieldComponent,
  ): void {
    const chunkSize = this.map.getChunkSize();
    const desired = new Set<string>();

    for (let cy = centerChunkY - this.chunkRadius; cy <= centerChunkY + this.chunkRadius; cy++) {
      for (let cx = centerChunkX - this.chunkRadius; cx <= centerChunkX + this.chunkRadius; cx++) {
        this.map.getChunk(cx, cy);

        for (let localY = 0; localY < chunkSize; localY++) {
          for (let localX = 0; localX < chunkSize; localX++) {
            const worldX = cx * chunkSize + localX;
            const worldY = cy * chunkSize + localY;
            const box = lootField.getBoxAt(worldX, worldY, this.map);
            if (!box) {
              continue;
            }

            const key = tileKey(worldX, worldY);
            desired.add(key);

            const existing = this.active.get(key);
            const tileElevation = this.map.getElevationAt(worldX, worldY);
            if (existing) {
              existing.tile.z = tileElevation;
              if (existing.sprite.spriteIndex !== box.spriteIndex) {
                existing.sprite.setSpriteIndex(box.spriteIndex);
              }
              continue;
            }

            const entity = new LootBoxEntity(worldX, worldY, box.spriteIndex, tileElevation);
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
}
