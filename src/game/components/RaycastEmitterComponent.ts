import { Component, CollisionEntity, Vector2D, type Entity } from "@claudiu-ceia/tick";

export type RaycastPoint = {
  x: number;
  y: number;
  z: number;
};

export type RaycastHitType = "terrain" | "collider";

export type RaycastHit = {
  type: RaycastHitType;
  point: RaycastPoint;
  distance: number;
  collider: CollisionEntity | null;
  entity: Entity | null;
};

export type RaycastResult = {
  origin: RaycastPoint;
  direction: Vector2D;
  endPoint: RaycastPoint;
  distance: number;
  hit: RaycastHit | null;
};

export type RaycastEmitterOptions = {
  enabled?: boolean;
  maxDistance?: number;
  fovRadians?: number;
  rayCount?: number;
  originHeight?: number;
};

export class RaycastEmitterComponent extends Component {
  public enabled: boolean;
  public maxDistance: number;
  public fovRadians: number;
  public rayCount: number;
  public originHeight: number;
  public primaryRayIndex = 0;
  public rays: RaycastResult[] = [];

  public constructor(options: RaycastEmitterOptions = {}) {
    super();
    this.enabled = options.enabled ?? true;
    this.maxDistance = Math.max(0.5, options.maxDistance ?? 18);
    this.fovRadians = Math.max(0, options.fovRadians ?? 0);
    this.rayCount = Math.max(1, Math.floor(options.rayCount ?? 1));
    this.originHeight = Math.max(0, options.originHeight ?? 0);
    this.primaryRayIndex = Math.floor(this.rayCount / 2);
  }

  public setOriginHeight(originHeight: number): void {
    this.originHeight = Math.max(0, originHeight);
  }

  public setCastProfile(maxDistance: number, fovRadians: number, rayCount: number): void {
    this.maxDistance = Math.max(0.5, maxDistance);
    this.fovRadians = Math.max(0, fovRadians);
    this.rayCount = Math.max(1, Math.floor(rayCount));
    this.primaryRayIndex = Math.floor(this.rayCount / 2);
  }

  public setRays(rays: RaycastResult[]): void {
    this.rays = rays;
    this.primaryRayIndex = Math.min(this.primaryRayIndex, Math.max(0, rays.length - 1));
  }

  public clearRays(): void {
    this.rays = [];
  }

  public getPrimaryRay(): RaycastResult | null {
    return this.rays[this.primaryRayIndex] ?? null;
  }
}
