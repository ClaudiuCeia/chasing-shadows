import {
  EcsRuntime,
  HudInputRouter,
  SystemPhase,
  SystemTickMode,
  Vector2D,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { PlayerTagComponent } from "../components/PlayerTagComponent.ts";
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

export class PointerMarkerSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(
    private readonly camera: IsometricCameraEntity,
    private readonly canvas: HTMLCanvasElement,
    private readonly marker: MarkerState,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
    private readonly onWorldClick?: (
      worldPoint: Vector2D,
      canvasPoint: Vector2D,
      elevation: number,
    ) => boolean,
    private readonly resolveWorldPoint?: (canvasPoint: Vector2D) => ResolvedPointerWorldPoint,
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry
      .query()
      .with(PlayerTagComponent)
      .with(MovementIntentComponent);
  }

  public update(): void {
    if (!this.runtime.input.isMouseClick()) {
      return;
    }

    if (HudInputRouter.consumePointerCapture(this.runtime, "click")) {
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

    if (this.onWorldClick?.(resolved.world, canvasPoint, resolved.elevation)) {
      return;
    }

    this.marker.point = resolved.world;
    this.marker.elevation = resolved.elevation;

    if (!this.query) {
      return;
    }

    for (const entity of this.query.run()) {
      entity.getComponent(MovementIntentComponent).setMoveTarget(resolved.world.x, resolved.world.y);
    }
  }
}
