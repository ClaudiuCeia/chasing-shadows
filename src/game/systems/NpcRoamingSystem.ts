import {
  EcsRuntime,
  Vector2D,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { NpcTagComponent } from "../components/NpcTagComponent.ts";
import { RoamingBehaviorComponent } from "../components/RoamingBehaviorComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { worldToIso } from "../../shared/math/iso.ts";

type RoamingNpcEntity = {
  getComponent(constr: typeof MovementIntentComponent): MovementIntentComponent;
  getComponent(constr: typeof RoamingBehaviorComponent): RoamingBehaviorComponent;
  getComponent(constr: typeof TransformComponent): TransformComponent;
};

export class NpcRoamingSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(runtime: EcsRuntime = EcsRuntime.getCurrent()) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry
      .query()
      .with(NpcTagComponent)
      .with(MovementIntentComponent)
      .with(RoamingBehaviorComponent)
      .with(TransformComponent);
  }

  public update(deltaTime: number): void {
    if (!this.query) {
      return;
    }

    for (const entity of this.query.run() as RoamingNpcEntity[]) {
      const behavior = entity.getComponent(RoamingBehaviorComponent);
      const intent = entity.getComponent(MovementIntentComponent);
      const transform = entity.getComponent(TransformComponent);

      behavior.elapsedSeconds += deltaTime;
      while (behavior.elapsedSeconds >= behavior.intervalSeconds) {
        behavior.elapsedSeconds -= behavior.intervalSeconds;
        behavior.advanceDirection();
      }

      transform.transform.rotation = behavior.directionAngle;
      const worldDirection = new Vector2D(
        Math.cos(behavior.directionAngle),
        Math.sin(behavior.directionAngle),
      );
      const isoDirection = worldToIso(worldDirection, {
        tileWidth: GAME_CONFIG.tileWidth,
        tileHeight: GAME_CONFIG.tileHeight,
      });
      const normalizedIso =
        isoDirection.magnitude > 0.0001 ? isoDirection.normalize() : Vector2D.zero;
      intent.setIntent(normalizedIso.x, -normalizedIso.y, true, false);
    }
  }
}
