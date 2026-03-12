export type Rgb = { r: number; g: number; b: number };

export const clampChannel = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value)));

export const parseHexColor = (hex: string): Rgb => {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    throw new Error(`Expected 6-char hex color, got '${hex}'`);
  }

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return { r, g, b };
};

export const rgbToHex = ({ r, g, b }: Rgb): string => {
  const toHex = (channel: number): string => clampChannel(channel).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
