import {
  CircleCollisionShape,
  CollisionEntity,
  RectangleCollisionShape,
  RenderComponent,
  RenderLayer,
  TransformComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import { DebugOverlayComponent } from "../components/DebugOverlayComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { HitColliderEntity } from "../entities/HitColliderEntity.ts";
import { ObstacleEntity } from "../entities/ObstacleEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { IsometricCameraEntity } from "./IsometricCameraEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

const CIRCLE_SEGMENTS = 18;

const drawMarker = (ctx: CanvasRenderingContext2D, point: Vector2D, color: string, radius: number): void => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
};

const drawPolyline = (ctx: CanvasRenderingContext2D, points: readonly Vector2D[], closePath = false): void => {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  if (closePath) {
    ctx.closePath();
  }
  ctx.stroke();
};

const projectRect = (
  camera: IsometricCameraEntity,
  canvasSize: Vector2D,
  x: number,
  y: number,
  width: number,
  height: number,
  elevation: number,
): Vector2D[] => [
  camera.toCanvasAt(new Vector2D(x, y), elevation, canvasSize),
  camera.toCanvasAt(new Vector2D(x + width, y), elevation, canvasSize),
  camera.toCanvasAt(new Vector2D(x + width, y + height), elevation, canvasSize),
  camera.toCanvasAt(new Vector2D(x, y + height), elevation, canvasSize),
];

const projectCircle = (
  camera: IsometricCameraEntity,
  canvasSize: Vector2D,
  center: Vector2D,
  radius: number,
  elevation: number,
): Vector2D[] => {
  const points: Vector2D[] = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const angle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    points.push(
      camera.toCanvasAt(
        new Vector2D(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius),
        elevation,
        canvasSize,
      ),
    );
  }
  return points;
};

export class DebugRayRenderComponent extends RenderComponent<PlayerEntity> {
  public constructor(
    private readonly debug: DebugOverlayComponent,
    private readonly map: InfiniteTilemap,
  ) {
    super(RenderLayer.Foreground);
  }

  public override isVisible(_camera: ICamera): boolean {
    return this.debug.enabled;
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    if (!(camera instanceof IsometricCameraEntity) || !this.debug.enabled) {
      return;
    }

    ctx.save();
    this.drawObstacleMovementColliders(ctx, camera, canvasSize);
    this.drawHitColliders(ctx, camera, canvasSize);
    this.drawPlayerColliders(ctx, camera, canvasSize);
    this.drawRay(ctx, camera, canvasSize);
    ctx.restore();
  }

  private drawObstacleMovementColliders(
    ctx: CanvasRenderingContext2D,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
  ): void {
    // TODO: Switch back to a cached type query once tick fixes inherited-type caching for `getEntitiesByType()`.
    const obstacles = this.ent.runtime.registry
      .getAllEntities()
      .filter((entity): entity is ObstacleEntity => entity instanceof ObstacleEntity);

    for (const obstacle of obstacles) {
      const elevation = this.getOwnerBaseElevation(obstacle);

      ctx.strokeStyle = "rgba(255, 0, 0, 0.95)";
      ctx.lineWidth = 1.25;
      this.drawColliderFootprint(ctx, camera, canvasSize, obstacle.movementCollider, elevation);
    }
  }

  private drawHitColliders(ctx: CanvasRenderingContext2D, camera: IsometricCameraEntity, canvasSize: Vector2D): void {
    // TODO: Switch back to a cached type query once tick fixes inherited-type caching for `getEntitiesByType()`.
    const hitColliders = this.ent.runtime.registry
      .getAllEntities()
      .filter((e): e is HitColliderEntity => e instanceof HitColliderEntity);

    for (const collider of hitColliders) {
      const owner = collider.parent;
      if (!owner || owner.id === this.ent.id || owner.parent?.id === this.ent.id) {
        continue;
      }

      const baseElevation = this.getOwnerBaseElevation(owner);
      const topElevation = baseElevation + collider.bodyHeight;

      ctx.strokeStyle = "rgba(255, 196, 120, 0.65)";
      ctx.fillStyle = "rgba(255, 196, 120, 0.08)";
      ctx.lineWidth = 1;
      this.drawColliderPrism(ctx, camera, canvasSize, collider, baseElevation, topElevation);
    }
  }

  private drawPlayerColliders(ctx: CanvasRenderingContext2D, camera: IsometricCameraEntity, canvasSize: Vector2D): void {
    const playerElevation = this.ent.tilePosition.z;
    const headElevation = playerElevation + this.ent.hitCollider.bodyHeight;

    ctx.strokeStyle = "rgba(111, 225, 255, 0.95)";
    ctx.lineWidth = 1.5;
    this.drawColliderFootprint(ctx, camera, canvasSize, this.ent.movementCollider, playerElevation);

    ctx.strokeStyle = "rgba(255, 247, 192, 0.82)";
    ctx.fillStyle = "rgba(255, 247, 192, 0.08)";
    ctx.lineWidth = 1;
    this.drawColliderPrism(ctx, camera, canvasSize, this.ent.hitCollider, playerElevation, headElevation);

    const feet = this.ent.transform.transform.position;
    const feetScreen = camera.toCanvasAt(feet, playerElevation, canvasSize);
    drawMarker(ctx, feetScreen, "rgba(167, 234, 255, 0.95)", 3);
    const headScreen = camera.toCanvasAt(feet, headElevation, canvasSize);
    drawMarker(ctx, headScreen, "rgba(255, 222, 133, 0.98)", 3);
  }

  private drawRay(ctx: CanvasRenderingContext2D, camera: IsometricCameraEntity, canvasSize: Vector2D): void {
    if (this.debug.renderLosRays && this.ent.rayEmitter.rays.length > 0) {
      this.ent.rayEmitter.rays.forEach((ray, index) => {
        const originScreen = camera.toCanvasAt(new Vector2D(ray.origin.x, ray.origin.y), ray.origin.z, canvasSize);
        const endScreen = camera.toCanvasAt(new Vector2D(ray.endPoint.x, ray.endPoint.y), ray.endPoint.z, canvasSize);
        const primary = index === this.ent.rayEmitter.primaryRayIndex;

        ctx.strokeStyle =
          ray.hit?.type === "collider"
            ? "rgba(255, 196, 120, 0.95)"
            : ray.hit?.type === "terrain"
              ? "rgba(255, 146, 101, 0.95)"
              : "rgba(111, 225, 255, 0.72)";
        ctx.lineWidth = primary ? 2 : 1;
        drawPolyline(ctx, [originScreen, endScreen]);

        if (primary) {
          drawMarker(ctx, originScreen, "rgba(255, 247, 192, 0.98)", 4);
        }
        drawMarker(ctx, endScreen, ray.hit ? "rgba(255, 121, 80, 0.98)" : "rgba(111, 225, 255, 0.9)", primary ? 3 : 2);

        if (ray.hit) {
          const hitScreen = camera.toCanvasAt(new Vector2D(ray.hit.point.x, ray.hit.point.y), ray.hit.point.z, canvasSize);
          ctx.strokeStyle = ray.hit.type === "collider" ? "rgba(255, 196, 120, 0.98)" : "rgba(255, 121, 80, 0.98)";
          ctx.lineWidth = primary ? 2 : 1.5;
          ctx.beginPath();
          ctx.moveTo(hitScreen.x - 5, hitScreen.y - 5);
          ctx.lineTo(hitScreen.x + 5, hitScreen.y + 5);
          ctx.moveTo(hitScreen.x + 5, hitScreen.y - 5);
          ctx.lineTo(hitScreen.x - 5, hitScreen.y + 5);
          ctx.stroke();
        }
      });
    }

    if (!this.debug.renderCombatRays) {
      return;
    }
    this.drawWeaponRays(ctx, camera, canvasSize);
  }

  private drawWeaponRays(ctx: CanvasRenderingContext2D, camera: IsometricCameraEntity, canvasSize: Vector2D): void {
    if (this.ent.weaponRaycast.rays.length === 0) {
      return;
    }

    this.ent.weaponRaycast.rays.forEach((ray, index) => {
      const originScreen = camera.toCanvasAt(new Vector2D(ray.origin.x, ray.origin.y), ray.origin.z, canvasSize);
      const endScreen = camera.toCanvasAt(new Vector2D(ray.endPoint.x, ray.endPoint.y), ray.endPoint.z, canvasSize);
      const primary = index === Math.floor(this.ent.weaponRaycast.rays.length / 2);
      ctx.strokeStyle = this.ent.weaponRaycast.mode === "targeted"
        ? "rgba(165, 255, 132, 0.92)"
        : "rgba(122, 186, 255, 0.92)";
      ctx.lineWidth = primary ? 2.4 : 1.4;
      drawPolyline(ctx, [originScreen, endScreen]);
      drawMarker(ctx, endScreen, "rgba(255, 255, 255, 0.96)", primary ? 3 : 2);
    });

    const targetPoint = this.ent.weaponRaycast.targetPoint;
    if (!targetPoint) {
      return;
    }

    const targetScreen = camera.toCanvasAt(new Vector2D(targetPoint.x, targetPoint.y), targetPoint.z, canvasSize);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 248, 214, 0.98)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(targetScreen.x, targetScreen.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawColliderFootprint(
    ctx: CanvasRenderingContext2D,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
    collider: CollisionEntity,
    elevation: number,
  ): void {
    const transform = collider.getComponent(TransformComponent).globalTransform;

    if (collider.shape instanceof CircleCollisionShape) {
      drawPolyline(ctx, projectCircle(camera, canvasSize, transform.position, collider.shape.radius, elevation), true);
      return;
    }

    if (collider.shape instanceof RectangleCollisionShape) {
      const box = collider.bbox();
      drawPolyline(ctx, projectRect(camera, canvasSize, box.x, box.y, box.width, box.height, elevation), true);
    }
  }

  private drawColliderPrism(
    ctx: CanvasRenderingContext2D,
    camera: IsometricCameraEntity,
    canvasSize: Vector2D,
    collider: CollisionEntity,
    bottomElevation: number,
    topElevation: number,
  ): void {
    if (!(collider.shape instanceof RectangleCollisionShape)) {
      this.drawColliderFootprint(ctx, camera, canvasSize, collider, bottomElevation);
      return;
    }

    const box = collider.bbox();
    const bottom = projectRect(camera, canvasSize, box.x, box.y, box.width, box.height, bottomElevation);
    const top = projectRect(camera, canvasSize, box.x, box.y, box.width, box.height, topElevation);

    ctx.beginPath();
    ctx.moveTo(bottom[0]!.x, bottom[0]!.y);
    for (let i = 1; i < bottom.length; i++) {
      ctx.lineTo(bottom[i]!.x, bottom[i]!.y);
    }
    for (let i = top.length - 1; i >= 0; i--) {
      ctx.lineTo(top[i]!.x, top[i]!.y);
    }
    ctx.closePath();
    ctx.fill();

    drawPolyline(ctx, bottom, true);
    drawPolyline(ctx, top, true);
    for (let i = 0; i < bottom.length; i++) {
      drawPolyline(ctx, [bottom[i]!, top[i]!]);
    }
  }

  private getOwnerBaseElevation(owner: { hasComponent(constr: typeof TilePositionComponent): boolean; getComponent(constr: typeof TilePositionComponent): TilePositionComponent; getComponent(constr: typeof TransformComponent): TransformComponent; }): number {
    if (owner.hasComponent(TilePositionComponent)) {
      return owner.getComponent(TilePositionComponent).z;
    }

    const position = owner.getComponent(TransformComponent).transform.position;
    return this.map.getElevationAt(position.x, position.y);
  }
}
