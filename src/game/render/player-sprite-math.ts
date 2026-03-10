import { Vector2D } from "@claudiu-ceia/tick";

const TWO_PI = Math.PI * 2;
const DIRECTIONS = 8;

export const screenVectorToDirectionIndex = (vector: Vector2D): number => {
  if (vector.magnitude <= 1e-6) {
    return 0;
  }

  const angle = Math.atan2(vector.y, vector.x);
  const clockwiseAngle = (angle + TWO_PI) % TWO_PI;
  const step = TWO_PI / DIRECTIONS;
  return Math.round(clockwiseAngle / step) % DIRECTIONS;
};
