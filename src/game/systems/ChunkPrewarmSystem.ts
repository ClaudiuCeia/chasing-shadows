import { SystemPhase, SystemTickMode, TransformComponent, type System } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

type ChunkPrewarmSystemOptions = {
  radius: number;
  maxChunksPerIdle?: number;
};

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining(): number;
};

type IdleCallback = (deadline: IdleDeadlineLike) => void;

type IdleHandle = number | ReturnType<typeof globalThis.setTimeout>;

type IdleScheduler = {
  request: (callback: IdleCallback) => IdleHandle;
  cancel: (handle: IdleHandle) => void;
};

const idleScheduler: IdleScheduler =
  typeof globalThis.requestIdleCallback === "function" &&
  typeof globalThis.cancelIdleCallback === "function"
    ? {
        request: (callback) => globalThis.requestIdleCallback(callback),
        cancel: (handle) => globalThis.cancelIdleCallback(handle as number),
      }
    : {
        request: (callback) =>
          globalThis.setTimeout(() => {
            callback({
              didTimeout: true,
              timeRemaining: () => 0,
            });
          }, 0),
        cancel: (handle) => globalThis.clearTimeout(handle),
      };

const chunkKey = (x: number, y: number): string => `${x}:${y}`;

export class ChunkPrewarmSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly radius: number;
  private readonly maxChunksPerIdle: number;
  private initialized = false;
  private lastChunkX = 0;
  private lastChunkY = 0;
  private idleHandle: IdleHandle | null = null;
  private destroyed = false;
  private readonly queuedKeys = new Set<string>();
  private readonly pendingChunks: Array<{ x: number; y: number }> = [];

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    options: ChunkPrewarmSystemOptions,
  ) {
    this.radius = Math.max(1, Math.floor(options.radius));
    this.maxChunksPerIdle = Math.max(1, Math.floor(options.maxChunksPerIdle ?? 1));
  }

  public update(): void {
    const position = this.player.getComponent(TransformComponent).transform.position;
    const chunkSize = this.map.getChunkSize();
    const chunkX = Math.floor(position.x / chunkSize);
    const chunkY = Math.floor(position.y / chunkSize);

    if (!this.initialized || chunkX !== this.lastChunkX || chunkY !== this.lastChunkY) {
      this.initialized = true;
      this.lastChunkX = chunkX;
      this.lastChunkY = chunkY;
      this.enqueueWindow(chunkX, chunkY);
    }

    this.scheduleDrain();
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.idleHandle !== null) {
      idleScheduler.cancel(this.idleHandle);
      this.idleHandle = null;
    }
    this.pendingChunks.length = 0;
    this.queuedKeys.clear();
  }

  private enqueueWindow(centerChunkX: number, centerChunkY: number): void {
    for (let ring = 0; ring <= this.radius; ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) {
            continue;
          }

          const chunkX = centerChunkX + dx;
          const chunkY = centerChunkY + dy;
          if (this.map.hasChunk(chunkX, chunkY)) {
            continue;
          }

          const key = chunkKey(chunkX, chunkY);
          if (this.queuedKeys.has(key)) {
            continue;
          }

          this.queuedKeys.add(key);
          this.pendingChunks.push({ x: chunkX, y: chunkY });
        }
      }
    }
  }

  private scheduleDrain(): void {
    if (this.destroyed || this.idleHandle !== null || this.pendingChunks.length === 0) {
      return;
    }

    this.idleHandle = idleScheduler.request((deadline) => {
      this.idleHandle = null;
      this.drainQueue(deadline);
      this.scheduleDrain();
    });
  }

  private drainQueue(deadline: IdleDeadlineLike): void {
    let processed = 0;
    while (this.pendingChunks.length > 0 && processed < this.maxChunksPerIdle) {
      if (processed > 0 && !deadline.didTimeout && deadline.timeRemaining() < 4) {
        break;
      }

      const next = this.pendingChunks.shift();
      if (!next) {
        break;
      }

      this.queuedKeys.delete(chunkKey(next.x, next.y));
      if (!this.map.hasChunk(next.x, next.y)) {
        this.map.getChunk(next.x, next.y);
      }
      processed++;
    }
  }
}
