# chasing_shadow

To install dependencies:

```bash
bun install
```

To run:

```bash
bun dev
```

## Terrain

Terrain is generated procedurally from a world seed and streamed in chunk-by-chunk.

- The main generator lives in `src/game/world/TerrainGenerator.ts`.
- `generateTerrainTile()` is the single-tile API used by tests and delta comparisons.
- `generateTerrainChunk()` is the hot path used by the runtime to build a whole chunk efficiently.

### How generation works

- The generator first builds a coarse hidden region field instead of treating the world like a plain heightmap.
- Jittered macro regions define the broad topology, while separate peak, basin, and rift fields add memorable large-scale shapes.
- That macro field is then sampled into shared vertex elevations.
- Tiles are built from those shared vertices, which gives us coherent ramps and smooth transitions without needing terrain cliffs.

### How chunking and streaming work

- `InfiniteTilemap` in `src/game/world/InfiniteTilemap.ts` owns the terrain cache.
- The world is divided into square chunks (`GAME_CONFIG.chunkSize`, currently `16`).
- When a system asks for a tile in an uncached chunk, the tilemap generates and stores the full chunk.
- Tile overrides from saves or gameplay are stored separately as deltas and layered on top of the generated terrain.

### How chunk warming works

- `ChunkPrewarmSystem` in `src/game/systems/ChunkPrewarmSystem.ts` watches the player's current chunk.
- It queues nearby chunks in rings around the player and warms them incrementally during idle time.
- This shifts chunk generation earlier so render and collision are more likely to hit already-cached chunks instead of paying the full generation cost in a visible frame.
- `LootBoxChunkSystem` also touches nearby chunks as part of spawning/despawning chunk-local world objects, but the prewarmer is the main anti-spike path.

Profiler helpers are available in the browser console:

```ts
window.__tickProfiler.start();
window.__tickProfiler.stop();
window.__tickProfiler.report();
window.__tickProfiler.clear();
window.__tickProfiler.scanOffscreenColliders();
```

Asset credits:

- `assets/cardboard-box` by Dani Maccari (`https://dani-maccari.itch.io/`), used under the attribution terms in `assets/cardboard-box/README.txt`.

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
