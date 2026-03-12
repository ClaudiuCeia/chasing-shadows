export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));
