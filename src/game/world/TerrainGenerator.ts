import { hash2 } from "../../shared/math/hash.ts";
import type { TileData } from "./tile-types.ts";

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

export const generateTerrainTile = (x: number, y: number, seed: number): TileData => {
  const broadRelief = fbm(x, y, seed + 101, 140, 3);
  const detailRelief = fbm(x + 73.1, y - 21.4, seed + 211, 52, 3);
  const plateauMask = smoothstep(0.55, 0.86, valueNoise(x - 37, y + 12, seed + 307, 95));

  const baseHeight = 1 + broadRelief * 3.1 + detailRelief * 1.6 + plateauMask * 1.2;
  const terraced = Math.round(baseHeight * 1.35) / 1.35;

  const smallCrater = craterField(x, y, seed + 503, 34, 5, 10, 1.35);
  const bigCrater = craterField(x, y, seed + 509, 72, 11, 20, 2.15);
  const hugeCrater = craterField(x, y, seed + 521, 140, 22, 38, 3.1);
  const craterDepth = Math.max(smallCrater, bigCrater, hugeCrater);

  const rift = riftStrength(x, y, seed);
  const ventMask = valueNoise(x + 11.9, y - 44.2, seed + 613, 15);
  const vent = rift * smoothstep(0.73, 0.9, ventMask);

  let height = terraced - craterDepth - rift * 1.2 + vent * 0.9;
  height = Math.round(height);
  const elevation = clamp(height, 0, MAX_TERRAIN_ELEVATION);

  return {
    kind: "regolith",
    blocking: false,
    elevation,
    occluder: elevation > 0,
  };
};
