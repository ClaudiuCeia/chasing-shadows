import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { HealthComponent } from "../components/HealthComponent.ts";
import { NeedsComponent } from "../components/NeedsComponent.ts";

type NeedsEntity = {
  getComponent(constr: typeof NeedsComponent): NeedsComponent;
  getComponent(constr: typeof HealthComponent): HealthComponent;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(100, value));

export class NeedsDecaySystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(runtime: EcsRuntime = EcsRuntime.getCurrent()) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(NeedsComponent).with(HealthComponent);
  }

  public update(deltaTime: number): void {
    if (!this.query) return;

    for (const entity of this.query.run() as NeedsEntity[]) {
      const needs = entity.getComponent(NeedsComponent);
      const health = entity.getComponent(HealthComponent);

      needs.hunger = clamp01(needs.hunger - 0.95 * deltaTime);
      needs.thirst = clamp01(needs.thirst - 1.35 * deltaTime);
      needs.sickness = clamp01(needs.sickness + 0.02 * deltaTime);

      if (needs.hunger <= 0) {
        health.hp = Math.max(0, health.hp - 1.3 * deltaTime);
      }

      if (needs.thirst <= 0) {
        health.hp = Math.max(0, health.hp - 2.1 * deltaTime);
      }
    }
  }
}
