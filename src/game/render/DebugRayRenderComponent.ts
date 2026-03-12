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
    this.drawObstacleColliders(ctx, camera, canvasSize);
    this.drawPlayerColliders(ctx, camera, canvasSize);
    this.drawRay(ctx, camera, canvasSize);
    ctx.restore();
  }

  private drawObstacleColliders(ctx: CanvasRenderingContext2D, camera: IsometricCameraEntity, canvasSize: Vector2D): void {
    ctx.strokeStyle = "rgba(125, 204, 255, 0.42)";
    ctx.lineWidth = 1;

    for (const obstacle of this.ent.runtime.registry.getEntitiesByType(ObstacleEntity)) {
      const collider = obstacle.collider;
      const position = obstacle.transform.transform.position;
      const elevation = obstacle.hasComponent(TilePositionComponent)
        ? obstacle.getComponent(TilePositionComponent).z
        : this.map.getElevationAt(position.x, position.y);
      this.drawColliderFootprint(ctx, camera, canvasSize, collider, elevation);
    }
  }

  private drawPlayerColliders(ctx: CanvasRenderingContext2D, camera: IsometricCameraEntity, canvasSize: Vector2D): void {
    ctx.strokeStyle = "rgba(111, 225, 255, 0.95)";
    ctx.lineWidth = 1.5;
    this.drawColliderFootprint(ctx, camera, canvasSize, this.ent.movementCollider, this.debug.playerElevation);

    const box = this.ent.hitCollider.bbox();
    const bottom = projectRect(camera, canvasSize, box.x, box.y, box.width, box.height, this.debug.playerElevation);
    const top = projectRect(camera, canvasSize, box.x, box.y, box.width, box.height, this.debug.headElevation);

    ctx.strokeStyle = "rgba(255, 247, 192, 0.82)";
    ctx.fillStyle = "rgba(255, 247, 192, 0.08)";
    ctx.lineWidth = 1;
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

    const feet = this.ent.transform.transform.position;
    const feetScreen = camera.toCanvasAt(feet, this.debug.playerElevation, canvasSize);
    drawMarker(ctx, feetScreen, "rgba(167, 234, 255, 0.95)", 3);
    const headScreen = camera.toCanvasAt(feet, this.debug.headElevation, canvasSize);
    drawMarker(ctx, headScreen, "rgba(255, 222, 133, 0.98)", 3);
  }

  private drawRay(ctx: CanvasRenderingContext2D, camera: IsometricCameraEntity, canvasSize: Vector2D): void {
    if (!this.debug.ray) {
      return;
    }

    const { origin, end, hit } = this.debug.ray;
    const originScreen = camera.toCanvasAt(new Vector2D(origin.x, origin.y), origin.z, canvasSize);
    const endScreen = camera.toCanvasAt(new Vector2D(end.x, end.y), end.z, canvasSize);

    ctx.strokeStyle = hit ? "rgba(255, 146, 101, 0.95)" : "rgba(111, 225, 255, 0.95)";
    ctx.lineWidth = 2;
    drawPolyline(ctx, [originScreen, endScreen]);

    drawMarker(ctx, originScreen, "rgba(255, 247, 192, 0.98)", 4);
    drawMarker(ctx, endScreen, hit ? "rgba(255, 121, 80, 0.98)" : "rgba(111, 225, 255, 0.98)", 3);

    if (hit) {
      const hitScreen = camera.toCanvasAt(new Vector2D(hit.x, hit.y), hit.z, canvasSize);
      ctx.strokeStyle = "rgba(255, 121, 80, 0.98)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hitScreen.x - 5, hitScreen.y - 5);
      ctx.lineTo(hitScreen.x + 5, hitScreen.y + 5);
      ctx.moveTo(hitScreen.x + 5, hitScreen.y - 5);
      ctx.lineTo(hitScreen.x - 5, hitScreen.y + 5);
      ctx.stroke();
    }
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
}
