import { Vector2D } from "@claudiu-ceia/tick";

export const clientToCanvas = (point: Vector2D, canvas: HTMLCanvasElement): Vector2D => {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return Vector2D.zero;
  }

  return new Vector2D(
    ((point.x - rect.left) / rect.width) * canvas.width,
    ((point.y - rect.top) / rect.height) * canvas.height,
  );
};
