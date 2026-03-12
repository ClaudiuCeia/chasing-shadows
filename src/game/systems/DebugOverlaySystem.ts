import { EcsRuntime, SystemPhase, SystemTickMode, Vector2D, type EntityQuery, type System } from "@claudiu-ceia/tick";
import { DebugOverlayComponent, type DebugRayPoint } from "../components/DebugOverlayComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

const DEBUG_RAY_STEP = 0.1;
const DEBUG_RAY_HIT_EPSILON = 0.02;
const MIN_INTERSECTION_DISTANCE = 0.001;

const cross2 = (a: Vector2D, b: Vector2D): number => a.x * b.y - a.y * b.x;

const toRayPoint = (point: Vector2D, z: number): DebugRayPoint => ({ x: point.x, y: point.y, z });

export class DebugOverlaySystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private uiQuery: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    private readonly camera: IsometricCameraEntity,
    private readonly canvas: HTMLCanvasElement,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.uiQuery = this.runtime.registry.query().with(DebugOverlayComponent);
  }

  public update(): void {
    const debug = this.uiQuery ? getSingletonComponent(this.uiQuery, DebugOverlayComponent) : null;
    if (!debug) {
      return;
    }

    if (this.runtime.input.isPressed("`") || this.runtime.input.isPressed("~")) {
      debug.toggle();
    }

    const position = this.player.transform.transform.position;
    const playerElevation = this.map.getElevationAt(position.x, position.y);
    const headElevation = playerElevation + this.player.hitCollider.bodyHeight;
    debug.setPlayerElevations(playerElevation, headElevation);

    if (!debug.enabled) {
      return;
    }

    const direction = new Vector2D(
      Math.cos(this.player.transform.transform.rotation),
      Math.sin(this.player.transform.transform.rotation),
    );
    if (direction.magnitude <= 0.0001) {
      debug.setRay(null);
      return;
    }

    const maxDistance = this.getViewportRayDistance(position, direction.normalize(), headElevation);
    let endPoint = position.add(direction.normalize().multiply(maxDistance));
    let hitPoint: Vector2D | null = null;
    let hitDistance: number | null = null;

    for (let distance = DEBUG_RAY_STEP; distance <= maxDistance; distance += DEBUG_RAY_STEP) {
      const samplePoint = position.add(direction.normalize().multiply(distance));
      const terrainElevation = this.map.getElevationAt(samplePoint.x, samplePoint.y);
      if (terrainElevation + DEBUG_RAY_HIT_EPSILON >= headElevation) {
        endPoint = samplePoint;
        hitPoint = samplePoint;
        hitDistance = distance;
        break;
      }
    }

    debug.setRay({
      origin: toRayPoint(position, headElevation),
      end: toRayPoint(endPoint, headElevation),
      hit: hitPoint ? toRayPoint(hitPoint, headElevation) : null,
      hitDistance,
    });
  }

  private getViewportRayDistance(origin: Vector2D, direction: Vector2D, elevation: number): number {
    const canvasSize = new Vector2D(this.canvas.width, this.canvas.height);
    const corners = [
      this.camera.canvasToWorldAt(new Vector2D(0, 0), elevation, canvasSize),
      this.camera.canvasToWorldAt(new Vector2D(this.canvas.width, 0), elevation, canvasSize),
      this.camera.canvasToWorldAt(new Vector2D(this.canvas.width, this.canvas.height), elevation, canvasSize),
      this.camera.canvasToWorldAt(new Vector2D(0, this.canvas.height), elevation, canvasSize),
    ];

    let bestDistance = 120;
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % corners.length]!;
      const edge = b.subtract(a);
      const offset = a.subtract(origin);
      const denominator = cross2(direction, edge);
      if (Math.abs(denominator) <= 0.000001) {
        continue;
      }

      const distance = cross2(offset, edge) / denominator;
      const edgeT = cross2(offset, direction) / denominator;
      if (distance >= MIN_INTERSECTION_DISTANCE && edgeT >= 0 && edgeT <= 1 && distance < bestDistance) {
        bestDistance = distance;
      }
    }

    return bestDistance;
  }
}
