import { hash2 } from "../../shared/math/hash.ts";
import { clamp } from "../../shared/math/clamp.ts";
import { lerp, smoothstep } from "../../shared/math/lerp.ts";
import { createTileCornerHeights, type TileData } from "./tile-types.ts";

export const MAX_TERRAIN_ELEVATION = 10;

// Terrain is generated in three layers:
// 1) a coarse jittered region field for large-scale landforms,
// 2) peak/basin/rift signals that shape those regions,
// 3) a tile rasterization pass that turns shared vertex heights into ramps.
const REGION_CELL_SIZE = 10;
const PEAK_CELL_SIZE = 32;
const BASIN_CELL_SIZE = 28;
const DETAIL_AMPLITUDE = 0.18;

const valueNoise = (x: number, y: number, seed: number, scale: number): number => {
  const fx = x / scale;
  const fy = y / scale;

  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const tx = fx - x0;
  const ty = fy - y0;

  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x1, y0, seed);
  const n01 = hash2(x0, y1, seed);
  const n11 = hash2(x1, y1, seed);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
};

const fbm = (x: number, y: number, seed: number, baseScale: number, octaves: number): number => {
  let sum = 0;
  let amp = 1;
  let ampTotal = 0;
  let scale = baseScale;

  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, y, seed + i * 97, scale) * amp;
    ampTotal += amp;
    amp *= 0.5;
    scale *= 0.5;
  }

  return ampTotal > 0 ? sum / ampTotal : 0;
};

type SamplePoint = {
  x: number;
  y: number;
};

type RegionSample = {
  distance: number;
  value: number;
};

const jitteredPointCache = new Map<string, SamplePoint>();
const macroRegionValueCache = new Map<string, number>();

const makeCacheKey = (a: number, b: number, c: number, d: number): string => `${a}:${b}:${c}:${d}`;

const sampleJitteredPoint = (cellX: number, cellY: number, seed: number, cellSize: number): SamplePoint => {
  const key = makeCacheKey(cellX, cellY, seed, cellSize);
  const cached = jitteredPointCache.get(key);
  if (cached) {
    return cached;
  }

  const point = {
    x: (cellX + lerp(0.2, 0.8, hash2(cellX, cellY, seed + 11))) * cellSize,
    y: (cellY + lerp(0.2, 0.8, hash2(cellX, cellY, seed + 29))) * cellSize,
  };
  jitteredPointCache.set(key, point);
  return point;
};

// Peak/basin fields are sparse radial influences placed on their own coarse grids.
// They give the world recognizable bowls, plateaus, and uplifts without relying on
// a raw per-tile noise field.
const radialField = (
  x: number,
  y: number,
  seed: number,
  cellSize: number,
  searchRadius: number,
  presenceThreshold: number,
  minRadius: number,
  maxRadius: number,
): number => {
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  let best = 0;

  for (let oy = -searchRadius; oy <= searchRadius; oy++) {
    for (let ox = -searchRadius; ox <= searchRadius; ox++) {
      const cx = cellX + ox;
      const cy = cellY + oy;
      if (hash2(cx, cy, seed + 3) < presenceThreshold) {
        continue;
      }

      const center = sampleJitteredPoint(cx, cy, seed + 41, cellSize);
      const radius = lerp(minRadius, maxRadius, hash2(cx, cy, seed + 53));
      const strength = lerp(0.75, 1.25, hash2(cx, cy, seed + 67));
      const dx = x - center.x;
      const dy = y - center.y;
      const norm = Math.sqrt(dx * dx + dy * dy) / Math.max(0.0001, radius);
      const influence = strength * Math.max(0, 1 - norm * norm);
      if (influence > best) {
        best = influence;
      }
    }
  }

  return clamp(best, 0, 1.5);
};

const riftStrength = (x: number, y: number, seed: number): number => {
  const a = valueNoise(x, y, seed + 401, 48);
  const b = valueNoise(x + 19.7, y - 7.3, seed + 409, 22);
  const combined = a * 0.65 + b * 0.35;
  const ridged = 1 - Math.abs(combined * 2 - 1);
  return smoothstep(0.74, 0.94, ridged);
};

const samplePeakField = (x: number, y: number, seed: number): number =>
  radialField(x, y, seed + 503, PEAK_CELL_SIZE, 2, 0.38, 12, 28);

const sampleBasinField = (x: number, y: number, seed: number): number =>
  radialField(x, y, seed + 907, BASIN_CELL_SIZE, 2, 0.42, 10, 24);

const sampleMacroRegionValue = (x: number, y: number, seed: number): number => {
  const xi = Math.round(x * 10);
  const yi = Math.round(y * 10);
  const cacheKey = makeCacheKey(xi, yi, seed, 0);
  const cached = macroRegionValueCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const continental = fbm(x + 23.7, y - 48.1, seed + 101, 120, 3);
  const broadRelief = fbm(x - 81.4, y + 36.2, seed + 211, 72, 2);
  const ridge = riftStrength(x * 0.85, y * 0.85, seed + 307);
  const peak = samplePeakField(x, y, seed);
  const basin = sampleBasinField(x + 18.3, y - 11.9, seed);
  const shelf = smoothstep(0.52, 0.8, valueNoise(x - 14.2, y + 17.6, seed + 401, 94));

  const value =
    -0.45 + continental * 2.15 + broadRelief * 1.45 + ridge * 1.05 + peak * 2.8 + shelf * 0.75 - basin * 2.35;
  macroRegionValueCache.set(cacheKey, value);
  return value;
};

// Blend the nearest jittered regions in a Voronoi-like way, but bias back toward the
// closest region center when we're well inside one region. That keeps plateaus and
// basins readable instead of dissolving into constant noise.
const sampleRegionField = (x: number, y: number, seed: number): number => {
  const cellX = Math.floor(x / REGION_CELL_SIZE);
  const cellY = Math.floor(y / REGION_CELL_SIZE);
  let first: RegionSample = { distance: Number.POSITIVE_INFINITY, value: 0 };
  let second: RegionSample = { distance: Number.POSITIVE_INFINITY, value: 0 };
  let third: RegionSample = { distance: Number.POSITIVE_INFINITY, value: 0 };
  let fourth: RegionSample = { distance: Number.POSITIVE_INFINITY, value: 0 };

  for (let oy = -2; oy <= 2; oy++) {
    for (let ox = -2; ox <= 2; ox++) {
      const regionX = cellX + ox;
      const regionY = cellY + oy;
      const center = sampleJitteredPoint(regionX, regionY, seed + 601, REGION_CELL_SIZE);
      const dx = x - center.x;
      const dy = y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const sample = { distance, value: sampleMacroRegionValue(center.x, center.y, seed + 659) };

      if (distance < first.distance) {
        fourth = third;
        third = second;
        second = first;
        first = sample;
      } else if (distance < second.distance) {
        fourth = third;
        third = second;
        second = sample;
      } else if (distance < third.distance) {
        fourth = third;
        third = sample;
      } else if (distance < fourth.distance) {
        fourth = sample;
      }
    }
  }

  const weighted = [first, second, third, fourth].reduce((sum, sample) => {
    const weight = 1 / Math.max(0.5, sample.distance);
    return sum + sample.value * weight;
  }, 0);
  const totalWeight = [first, second, third, fourth].reduce(
    (sum, sample) => sum + 1 / Math.max(0.5, sample.distance),
    0,
  );
  const blended = totalWeight > 0 ? weighted / totalWeight : first.value;
  const interior = smoothstep(0.6, 3.1, second.distance - first.distance);
  return lerp(blended, first.value, interior);
};

// A small domain warp keeps region boundaries from looking too grid-aligned while the
// lower-amplitude detail field preserves the broad macro shapes established above.
const sampleBaseHeight = (x: number, y: number, seed: number): number => {
  const warpedX = x + (valueNoise(x + 7.1, y - 5.4, seed + 719, 54) - 0.5) * 12;
  const warpedY = y + (valueNoise(x - 9.8, y + 11.6, seed + 733, 54) - 0.5) * 12;
  const regionField = sampleRegionField(warpedX, warpedY, seed);
  const valleyNoise = fbm(warpedX - 13.4, warpedY + 9.7, seed + 787, 40, 2);
  const detail = fbm(warpedX + 21.8, warpedY - 17.2, seed + 839, 22, 2) - 0.5;
  return regionField - valleyNoise * 0.35 + detail * DETAIL_AMPLITUDE;
};

const sampleTileKind = (
  x: number,
  y: number,
  elevation: number,
  seed: number,
): TileData["kind"] => {
  const broad = valueNoise(x + 13.4, y - 27.1, seed + 811, 42);
  const detail = valueNoise(x - 8.2, y + 19.6, seed + 853, 18);
  const basin = sampleBasinField(x, y, seed + 911);
  const peak = samplePeakField(x, y, seed + 977);
  const combined = broad * 0.55 + detail * 0.2 + basin * 0.15 + peak * 0.1;

  if (elevation >= 5 || peak > 0.72 || combined > 0.84) {
    return "rock";
  }
  if (combined > 0.64) {
    return "scrap";
  }
  if (basin > 0.74 || combined < 0.16) {
    return "shelter";
  }
  return "regolith";
};

const sampleRawVertexHeight = (vx: number, vy: number, seed: number): number =>
  sampleBaseHeight(vx * 0.5, vy * 0.5, seed);

const sampleVertexElevation = (vx: number, vy: number, seed: number): number => {
  const center = sampleRawVertexHeight(vx, vy, seed);
  const cardinals = (
    sampleRawVertexHeight(vx - 1, vy, seed) +
    sampleRawVertexHeight(vx + 1, vy, seed) +
    sampleRawVertexHeight(vx, vy - 1, seed) +
    sampleRawVertexHeight(vx, vy + 1, seed)
  ) / 4;
  const smoothedBase = center * 0.72 + cardinals * 0.28;
  return clamp(Math.round(smoothedBase), 0, MAX_TERRAIN_ELEVATION);
};

export const generateTerrainTile = (x: number, y: number, seed: number): TileData => {
  const corners = sampleTileCorners(x, y, seed);
  return createTerrainTile(x, y, corners, seed);
};

const sampleTileCorners = (x: number, y: number, seed: number) =>
  createTileCornerHeights({
    northWest: sampleVertexElevation(x * 2 - 1, y * 2 - 1, seed),
    northEast: sampleVertexElevation(x * 2 + 1, y * 2 - 1, seed),
    southEast: sampleVertexElevation(x * 2 + 1, y * 2 + 1, seed),
    southWest: sampleVertexElevation(x * 2 - 1, y * 2 + 1, seed),
  });

const createTerrainTile = (x: number, y: number, tileCorners: TileData["corners"], seed: number): TileData => {
  const corners = createTileCornerHeights({
    northWest: tileCorners.northWest,
    northEast: tileCorners.northEast,
    southEast: tileCorners.southEast,
    southWest: tileCorners.southWest,
  });

  const tileElevation = Math.max(
    corners.northWest,
    corners.northEast,
    corners.southEast,
    corners.southWest,
  );

  return {
    kind: sampleTileKind(x, y, tileElevation, seed),
    blocking: false,
    elevation: tileElevation,
    occluder: tileElevation > 0,
    corners,
  };
};

// Chunk generation precomputes the shared vertex grid once, then builds all tiles from
// that grid. This removes a large amount of duplicate work compared with sampling every
// tile corner independently.
export const generateTerrainChunk = (
  chunkX: number,
  chunkY: number,
  chunkSize: number,
  seed: number,
): TileData[] => {
  const worldStartX = chunkX * chunkSize;
  const worldStartY = chunkY * chunkSize;
  const vertexWidth = chunkSize + 1;
  const vertexElevations = new Array<number>(vertexWidth * vertexWidth);

  for (let vy = 0; vy <= chunkSize; vy++) {
    for (let vx = 0; vx <= chunkSize; vx++) {
      const worldVertexX = (worldStartX + vx) * 2 - 1;
      const worldVertexY = (worldStartY + vy) * 2 - 1;
      vertexElevations[vy * vertexWidth + vx] = sampleVertexElevation(worldVertexX, worldVertexY, seed);
    }
  }

  const tiles: TileData[] = [];
  for (let y = 0; y < chunkSize; y++) {
    for (let x = 0; x < chunkSize; x++) {
      const worldX = worldStartX + x;
      const worldY = worldStartY + y;
      const vertexIndex = y * vertexWidth + x;
      const corners = createTileCornerHeights({
        northWest: vertexElevations[vertexIndex] ?? 0,
        northEast: vertexElevations[vertexIndex + 1] ?? 0,
        southEast: vertexElevations[vertexIndex + vertexWidth + 1] ?? 0,
        southWest: vertexElevations[vertexIndex + vertexWidth] ?? 0,
      });
      tiles.push(createTerrainTile(worldX, worldY, corners, seed));
    }
  }

  return tiles;
};
