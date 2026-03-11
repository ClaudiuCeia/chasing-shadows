import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";

type AttackEntity = {
  getComponent(constr: typeof PlayerAttackComponent): PlayerAttackComponent;
};

export class PlayerAttackSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(runtime: EcsRuntime = EcsRuntime.getCurrent()) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(PlayerAttackComponent);
  }

  public update(deltaTime: number): void {
    if (!this.query) {
      return;
    }

    for (const entity of this.query.run() as AttackEntity[]) {
      entity.getComponent(PlayerAttackComponent).update(deltaTime);
    }
  }
}
