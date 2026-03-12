import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { HealthComponent } from "../components/HealthComponent.ts";
import { NeedsComponent } from "../components/NeedsComponent.ts";
import { clamp } from "../../shared/math/clamp.ts";
import { GAME_CONFIG } from "../config/game-config.ts";

type NeedsEntity = {
  getComponent(constr: typeof NeedsComponent): NeedsComponent;
  getComponent(constr: typeof HealthComponent): HealthComponent;
};

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

      needs.hunger = clamp(needs.hunger - GAME_CONFIG.hungerDecayRate * deltaTime, 0, 100);
      needs.thirst = clamp(needs.thirst - GAME_CONFIG.thirstDecayRate * deltaTime, 0, 100);
      needs.sickness = clamp(needs.sickness + GAME_CONFIG.sicknessRate * deltaTime, 0, 100);

      if (needs.hunger <= 0) {
        health.hp = Math.max(0, health.hp - GAME_CONFIG.hungerDamageRate * deltaTime);
      }

      if (needs.thirst <= 0) {
        health.hp = Math.max(0, health.hp - GAME_CONFIG.thirstDamageRate * deltaTime);
      }
    }
  }
}
