import {
  EcsRuntime,
  HudInputRouter,
  SystemPhase,
  SystemTickMode,
  Vector2D,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { PointerWorldComponent } from "../components/PointerWorldComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { clientToCanvas } from "../../shared/canvas-utils.ts";

type ResolvedPointerWorldPoint = {
  world: Vector2D;
  elevation: number;
};

export class PointerMarkerSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private wasMouseDown = false;
  private query: EntityQuery | null = null;

  public constructor(
    private readonly camera: IsometricCameraEntity,
    private readonly canvas: HTMLCanvasElement,
    private readonly map: InfiniteTilemap,
    private readonly maxTerrainElevation: number,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(PointerWorldComponent);
  }

  public update(): void {
    const pointer = this.query ? getSingletonComponent(this.query, PointerWorldComponent) : null;
    if (!pointer) {
      return;
    }

    const mouse = this.runtime.input.getMousePos();
    const canvasPoint = clientToCanvas(mouse, this.canvas);
    const resolved = this.resolveWorldPoint(canvasPoint);
    const mouseDown = this.runtime.input.isMouseDown(0);
    if (!mouseDown) {
      const wasBlockedByHud = pointer.blockedByHud;
      pointer.setResolved(resolved.world, canvasPoint, resolved.elevation);
      if (this.wasMouseDown) {
        pointer.phase = !wasBlockedByHud && pointer.mode !== "attack" && pointer.worldPoint !== null ? "click" : "release";
        pointer.blockedByHud = false;
        this.wasMouseDown = false;
        return;
      }
      pointer.blockedByHud = false;
      pointer.phase = null;
      this.wasMouseDown = false;
      return;
    }

    const justPressed = !this.wasMouseDown;
    this.wasMouseDown = true;

    if (justPressed) {
      if (HudInputRouter.consumePointerCapture(this.runtime, "pointerdown")) {
        pointer.blockedByHud = true;
        pointer.mode = "interaction";
        pointer.phase = "press";
        pointer.clearResolved();
        return;
      }
    } else if (pointer.blockedByHud) {
      pointer.phase = "hold";
      return;
    }

    pointer.blockedByHud = false;
    pointer.setResolved(resolved.world, canvasPoint, resolved.elevation);
    pointer.phase = justPressed ? "press" : "hold";
  }

  private resolveWorldPoint(canvasPoint: Vector2D): ResolvedPointerWorldPoint {
    const canvasSize = new Vector2D(this.canvas.width, this.canvas.height);
    let bestMatch: { world: Vector2D; elevation: number; distanceSq: number } | null = null;

    for (let elevation = this.maxTerrainElevation; elevation >= 0; elevation--) {
      const candidateWorld = this.camera.canvasToWorldAt(canvasPoint, elevation, canvasSize);
      const surfaceElevation = this.map.getElevationAt(candidateWorld.x, candidateWorld.y);
      const projected = this.camera.toCanvasAt(candidateWorld, surfaceElevation, canvasSize);
      const dx = projected.x - canvasPoint.x;
      const dy = projected.y - canvasPoint.y;
      const distanceSq = dx * dx + dy * dy;

      if (!bestMatch || distanceSq < bestMatch.distanceSq) {
        bestMatch = {
          world: candidateWorld,
          elevation: surfaceElevation,
          distanceSq,
        };
      }
    }

    if (bestMatch) {
      return {
        world: bestMatch.world,
        elevation: bestMatch.elevation,
      };
    }

    const fallbackWorld = this.camera.canvasToWorld(canvasPoint, canvasSize);
    return {
      world: fallbackWorld,
      elevation: this.map.getElevationAt(fallbackWorld.x, fallbackWorld.y),
    };
  }
}
