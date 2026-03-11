import { Vector2D } from "@claudiu-ceia/tick";

export type TerminatorSide = "sun" | "dark";

export type TerminatorModelOptions = {
  safeBandHalfWidth: number;
  travelSpeed: number;
  travelDistance?: number;
  direction?: Vector2D;
};

const normalize = (vector: Vector2D): Vector2D => {
  const magnitude = vector.magnitude;
  if (magnitude <= 0) {
    return new Vector2D(1, -1).normalize();
  }
  return vector.divide(magnitude);
};

export class TerminatorModel {
  private travelDistance: number;

  public readonly direction: Vector2D;
  public readonly normal: Vector2D;
  public readonly tangent: Vector2D;
  public readonly safeBandHalfWidth: number;
  public readonly travelSpeed: number;

  public constructor(options: TerminatorModelOptions) {
    this.safeBandHalfWidth = Math.max(0, options.safeBandHalfWidth);
    this.travelSpeed = Math.max(0, options.travelSpeed);
    this.travelDistance = options.travelDistance ?? 0;

    this.direction = normalize(options.direction ?? new Vector2D(1, -1));
    this.normal = this.direction;
    this.tangent = normalize(new Vector2D(-this.normal.y, this.normal.x));
  }

  public update(deltaTime: number): void {
    this.travelDistance += Math.max(0, deltaTime) * this.travelSpeed;
  }

  public setTravelDistance(distance: number): void {
    this.travelDistance = distance;
  }

  public getTravelDistance(): number {
    return this.travelDistance;
  }

  public getCenterPoint(): Vector2D {
    return this.direction.multiply(this.travelDistance);
  }

  public getCenterX(): number {
    return this.direction.x * this.travelDistance;
  }

  public getCenterY(): number {
    return this.direction.y * this.travelDistance;
  }

  public signedDistanceXY(x: number, y: number): number {
    const centerX = this.getCenterX();
    const centerY = this.getCenterY();
    return (x - centerX) * this.normal.x + (y - centerY) * this.normal.y;
  }

  public signedDistance(point: Vector2D): number {
    return this.signedDistanceXY(point.x, point.y);
  }

  public distanceOutsideSafeBandXY(x: number, y: number): number {
    return Math.max(0, Math.abs(this.signedDistanceXY(x, y)) - this.safeBandHalfWidth);
  }

  public distanceOutsideSafeBand(point: Vector2D): number {
    return this.distanceOutsideSafeBandXY(point.x, point.y);
  }

  public getSideXY(x: number, y: number): TerminatorSide {
    return this.signedDistanceXY(x, y) >= 0 ? "sun" : "dark";
  }

  public getSide(point: Vector2D): TerminatorSide {
    return this.getSideXY(point.x, point.y);
  }
}
