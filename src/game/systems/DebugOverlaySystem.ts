import { EcsRuntime, SystemPhase, SystemTickMode, type EntityQuery, type System } from "@claudiu-ceia/tick";
import { DebugOverlayComponent } from "../components/DebugOverlayComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";

export class DebugOverlaySystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private uiQuery: EntityQuery | null = null;

  public constructor(runtime: EcsRuntime = EcsRuntime.getCurrent()) {
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
  }
}
