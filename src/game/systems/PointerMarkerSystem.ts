import {
  EcsRuntime,
  HudInputRouter,
  SystemPhase,
  SystemTickMode,
  Vector2D,
  type System,
} from "@claudiu-ceia/tick";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";
import { MarkerState } from "../state/MarkerState.ts";

const clientToCanvas = (point: Vector2D, canvas: HTMLCanvasElement): Vector2D => {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return Vector2D.zero;
  }

  return new Vector2D(
    ((point.x - rect.left) / rect.width) * canvas.width,
    ((point.y - rect.top) / rect.height) * canvas.height,
  );
};

type ResolvedPointerWorldPoint = {
  world: Vector2D;
  elevation: number;
};

export type PointerWorldActionPhase = "press" | "hold" | "release";
export type PointerWorldActionResult = "interaction" | "attack" | null;

export class PointerMarkerSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private pointerMode: PointerWorldActionResult = null;
  private wasMouseDown = false;

  public constructor(
    private readonly camera: IsometricCameraEntity,
    private readonly canvas: HTMLCanvasElement,
    private readonly marker: MarkerState,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
    private readonly onWorldAction?: (
      worldPoint: Vector2D | null,
      canvasPoint: Vector2D | null,
      elevation: number | null,
      phase: PointerWorldActionPhase,
    ) => PointerWorldActionResult,
    private readonly resolveWorldPoint?: (canvasPoint: Vector2D) => ResolvedPointerWorldPoint,
  ) {
    this.runtime = runtime;
  }

  public update(): void {
    const mouseDown = this.runtime.input.isMouseDown(0);
    if (!mouseDown) {
      if (this.wasMouseDown && this.pointerMode === "attack") {
        this.onWorldAction?.(null, null, null, "release");
      }
      this.pointerMode = null;
      this.wasMouseDown = false;
      return;
    }

    const justPressed = !this.wasMouseDown;
    this.wasMouseDown = true;

    if (justPressed) {
      if (HudInputRouter.consumePointerCapture(this.runtime, "pointerdown")) {
        this.pointerMode = "interaction";
        return;
      }
    } else if (this.pointerMode === "interaction") {
      return;
    }

    const mouse = this.runtime.input.getMousePos();
    const canvasPoint = clientToCanvas(mouse, this.canvas);
    const world = this.camera.canvasToWorld(
      canvasPoint,
      new Vector2D(this.canvas.width, this.canvas.height),
    );
    const resolved = this.resolveWorldPoint?.(canvasPoint) ?? {
      world,
      elevation: 0,
    };

    const action = this.onWorldAction?.(
      resolved.world,
      canvasPoint,
      resolved.elevation,
      justPressed ? "press" : "hold",
    ) ?? null;
    if (justPressed) {
      this.pointerMode = action;
    }

    if (action === "interaction") {
      return;
    }

    this.marker.point = resolved.world;
    this.marker.elevation = resolved.elevation;
  }
}
