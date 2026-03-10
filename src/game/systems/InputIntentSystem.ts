import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";

type IntentEntity = {
  getComponent(constr: typeof MovementIntentComponent): MovementIntentComponent;
};

export class InputIntentSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(runtime: EcsRuntime = EcsRuntime.getCurrent()) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(MovementIntentComponent);
  }

  public update(): void {
    if (!this.query) return;

    const left = this.runtime.input.isDown("a") || this.runtime.input.isDown("ArrowLeft");
    const right = this.runtime.input.isDown("d") || this.runtime.input.isDown("ArrowRight");
    const up = this.runtime.input.isDown("w") || this.runtime.input.isDown("ArrowUp");
    const down = this.runtime.input.isDown("s") || this.runtime.input.isDown("ArrowDown");
    const sprint = this.runtime.input.isDown("Shift");

    const x = (right ? 1 : 0) - (left ? 1 : 0);
    const y = (down ? 1 : 0) - (up ? 1 : 0);
    const hasKeyboardIntent = x !== 0 || y !== 0;

    for (const entity of this.query.run() as IntentEntity[]) {
      const intent = entity.getComponent(MovementIntentComponent);
      intent.setIntent(x, y, hasKeyboardIntent && sprint);
      if (hasKeyboardIntent) {
        intent.clearMoveTarget();
      }
    }
  }
}
