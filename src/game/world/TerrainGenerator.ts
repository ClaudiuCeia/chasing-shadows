import { hash2 } from "../../shared/math/hash.ts";
import { createTileCornerHeights, type TileData } from "./tile-types.ts";

export const MAX_TERRAIN_ELEVATION = 6;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

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

const craterField = (
  x: number,
  y: number,
  seed: number,
  cellSize: number,
  minRadius: number,
  maxRadius: number,
  maxDepth: number,
): number => {
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  let best = 0;

  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = cellX + ox;
      const cy = cellY + oy;
      const centerX = (cx + hash2(cx, cy, seed + 11)) * cellSize;
      const centerY = (cy + hash2(cx, cy, seed + 17)) * cellSize;
      const radius = lerp(minRadius, maxRadius, hash2(cx, cy, seed + 23));
      const depth = maxDepth * (0.6 + hash2(cx, cy, seed + 31) * 0.4);

      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const norm = distance / Math.max(0.0001, radius);
      if (norm >= 1.2) {
        continue;
      }

      const bowl = norm < 1 ? 1 - norm * norm : 0;
      const rim = smoothstep(0.85, 1.1, norm) * (1 - smoothstep(1.1, 1.2, norm));
      const crater = Math.max(0, bowl * depth - rim * 0.35);
      if (crater > best) {
        best = crater;
      }
    }
  }

  return best;
};

const riftStrength = (x: number, y: number, seed: number): number => {
  const a = valueNoise(x, y, seed + 401, 48);
  const b = valueNoise(x + 19.7, y - 7.3, seed + 409, 22);
  const combined = a * 0.65 + b * 0.35;
  const ridged = 1 - Math.abs(combined * 2 - 1);
  return smoothstep(0.74, 0.94, ridged);
};

const sampleBaseHeight = (x: number, y: number, seed: number): number => {
  const continental = fbm(x, y, seed + 101, 320, 2);
  const broadRelief = fbm(x - 91.7, y + 47.2, seed + 211, 180, 2);
  const gentleVariation = fbm(x + 18.4, y - 83.1, seed + 307, 92, 2);
  const uplift = smoothstep(0.54, 0.86, valueNoise(x + 31, y - 29, seed + 401, 210));
  const crater = craterField(x, y, seed + 503, 120, 10, 22, 0.35);

  return -0.9 + continental * 4.4 + broadRelief * 2.4 + gentleVariation * 1.15 + uplift * 1.35 - crater;
};

const sampleCliffField = (x: number, y: number, seed: number): number => {
  const plateau = smoothstep(0.71, 0.88, valueNoise(x - 14.7, y + 22.1, seed + 601, 172));
  const ridge = smoothstep(0.74, 0.91, valueNoise(x + 41.9, y - 16.8, seed + 613, 132));
  const mask = plateau * 0.65 + ridge * 0.35;
  return smoothstep(0.7, 0.94, mask);
};

const sampleSurfaceVariant = (x: number, y: number, seed: number): TileData["surfaceVariant"] => {
  const noise = hash2(x, y, seed + 719);
  if (noise < 0.18) {
    return "sun";
  }
  if (noise > 0.82) {
    return "dark";
  }
  return "neutral";
};

const sampleRawVertexHeight = (vx: number, vy: number, seed: number): number => {
  const x = vx * 0.5;
  const y = vy * 0.5;
  const baseHeight = sampleBaseHeight(x, y, seed);
  const cliffField = sampleCliffField(x, y, seed);
  const cliffSteps = Math.round(cliffField * 2.2);
  return baseHeight + cliffSteps;
};

const sampleVertexElevation = (vx: number, vy: number, seed: number): number => {
  const x = vx * 0.5;
  const y = vy * 0.5;
  const center = sampleRawVertexHeight(vx, vy, seed);
  const cardinals = (
    sampleRawVertexHeight(vx - 1, vy, seed) +
    sampleRawVertexHeight(vx + 1, vy, seed) +
    sampleRawVertexHeight(vx, vy - 1, seed) +
    sampleRawVertexHeight(vx, vy + 1, seed)
  ) / 4;
  const diagonals = (
    sampleRawVertexHeight(vx - 1, vy - 1, seed) +
    sampleRawVertexHeight(vx + 1, vy - 1, seed) +
    sampleRawVertexHeight(vx - 1, vy + 1, seed) +
    sampleRawVertexHeight(vx + 1, vy + 1, seed)
  ) / 4;

  const smoothedBase = center * 0.64 + cardinals * 0.24 + diagonals * 0.12;
  const cliffField = sampleCliffField(x, y, seed);
  const cliffBoost = cliffField > 0.84 ? 2 : cliffField > 0.74 ? 1 : 0;
  return clamp(Math.round(smoothedBase) + cliffBoost, 0, MAX_TERRAIN_ELEVATION);
};

export const generateTerrainTile = (x: number, y: number, seed: number): TileData => {
  const corners = createTileCornerHeights({
    northWest: sampleVertexElevation(x * 2 - 1, y * 2 - 1, seed),
    northEast: sampleVertexElevation(x * 2 + 1, y * 2 - 1, seed),
    southEast: sampleVertexElevation(x * 2 + 1, y * 2 + 1, seed),
    southWest: sampleVertexElevation(x * 2 - 1, y * 2 + 1, seed),
  });

  const tileElevation = Math.max(
    corners.northWest,
    corners.northEast,
    corners.southEast,
    corners.southWest,
  );

  return {
    kind: "regolith",
    blocking: false,
    elevation: tileElevation,
    occluder: tileElevation > 0,
    corners,
    surfaceVariant: sampleSurfaceVariant(x, y, seed),
  };
};
