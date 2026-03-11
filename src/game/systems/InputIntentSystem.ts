import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { PlayerTagComponent } from "../components/PlayerTagComponent.ts";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";

type IntentEntity = {
  getComponent(constr: typeof PlayerAttackComponent): PlayerAttackComponent;
  getComponent(constr: typeof MovementIntentComponent): MovementIntentComponent;
  getComponent(constr: typeof TransformComponent): TransformComponent;
};

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

export class InputIntentSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;
  private walkToggled = false;
  private crouchToggled = false;

  public constructor(
    private readonly camera: IsometricCameraEntity,
    private readonly canvas: HTMLCanvasElement,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry
      .query()
      .with(PlayerTagComponent)
      .with(PlayerAttackComponent)
      .with(MovementIntentComponent)
      .with(TransformComponent);
  }

  public update(): void {
    if (!this.query) return;

    const left = this.runtime.input.isDown("a") || this.runtime.input.isDown("ArrowLeft");
    const right = this.runtime.input.isDown("d") || this.runtime.input.isDown("ArrowRight");
    const up = this.runtime.input.isDown("w") || this.runtime.input.isDown("ArrowUp");
    const down = this.runtime.input.isDown("s") || this.runtime.input.isDown("ArrowDown");

    if (this.runtime.input.isPressed("Shift")) {
      this.walkToggled = !this.walkToggled;
    }

    if (this.runtime.input.isPressed("c") || this.runtime.input.isPressed("C")) {
      this.crouchToggled = !this.crouchToggled;
    }

    const toggleFireMode = this.runtime.input.isPressed("v") || this.runtime.input.isPressed("V");

    const strafe = (right ? 1 : 0) - (left ? 1 : 0);
    const forward = (up ? 1 : 0) - (down ? 1 : 0);

    const mouse = this.runtime.input.getMousePos();
    const canvasPoint = clientToCanvas(mouse, this.canvas);
    const worldPoint = this.camera.canvasToWorld(
      canvasPoint,
      new Vector2D(this.canvas.width, this.canvas.height),
    );

    for (const entity of this.query.run() as IntentEntity[]) {
      const attack = entity.getComponent(PlayerAttackComponent);
      const intent = entity.getComponent(MovementIntentComponent);
      const transform = entity.getComponent(TransformComponent);
      if (toggleFireMode) {
        attack.toggleFireMode();
      }
      intent.setIntent(strafe, forward, this.walkToggled, this.crouchToggled);

      const look = worldPoint.subtract(transform.transform.position);
      if (look.magnitude > 0.0001) {
        transform.transform.rotation = Math.atan2(look.y, look.x);
      }
    }
  }
}
