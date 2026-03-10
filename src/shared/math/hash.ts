const UINT32_SPACE = 0x100000000;

const mix32 = (value: number): number => {
  let x = value >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
};

export const hash2 = (x: number, y: number, seed: number): number => {
  const h = mix32((x * 374761393) ^ (y * 668265263) ^ (seed * 362437));
  return h / UINT32_SPACE;
};

export const randomSeed = (): number => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const data = new Uint32Array(1);
    crypto.getRandomValues(data);
    return data[0] ?? 1;
  }

  return Math.floor(Math.random() * UINT32_SPACE);
};
