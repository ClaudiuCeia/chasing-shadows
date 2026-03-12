import { Component, Vector2D } from "@claudiu-ceia/tick";

export type TerminatorSide = "sun" | "dark";

export type TerminatorComponentOptions = {
  safeBandHalfWidth: number;
  travelSpeed: number;
  travelDistance?: number;
  direction?: Vector2D;
};

const DEFAULT_DIRECTION = new Vector2D(1, -1).normalize();

const withFallbackDirection = (vector: Vector2D): Vector2D =>
  vector.magnitude > 0 ? vector.normalize() : DEFAULT_DIRECTION;

export class TerminatorComponent extends Component {
  private travelDistanceValue: number;

  public readonly direction: Vector2D;
  public readonly tangent: Vector2D;
  public readonly safeBandHalfWidth: number;
  public readonly travelSpeed: number;

  public constructor(options: TerminatorComponentOptions) {
    super();
    this.safeBandHalfWidth = Math.max(0, options.safeBandHalfWidth);
    this.travelSpeed = Math.max(0, options.travelSpeed);
    this.travelDistanceValue = options.travelDistance ?? 0;

    this.direction = withFallbackDirection(options.direction ?? DEFAULT_DIRECTION);
    this.tangent = withFallbackDirection(new Vector2D(-this.direction.y, this.direction.x));
  }

  public get travelDistance(): number {
    return this.travelDistanceValue;
  }

  public set travelDistance(value: number) {
    this.travelDistanceValue = value;
  }

  public advance(deltaTime: number): void {
    this.travelDistance += Math.max(0, deltaTime) * this.travelSpeed;
  }

  public getCenterX(): number {
    return this.direction.x * this.travelDistance;
  }

  public getCenterY(): number {
    return this.direction.y * this.travelDistance;
  }

  public signedDistanceXY(x: number, y: number): number {
    return (x - this.getCenterX()) * this.direction.x + (y - this.getCenterY()) * this.direction.y;
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
