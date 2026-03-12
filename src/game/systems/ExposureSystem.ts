import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { HealthComponent } from "../components/HealthComponent.ts";
import type { TerminatorComponent } from "../components/TerminatorComponent.ts";
import { TemperatureComponent } from "../components/TemperatureComponent.ts";
import { clamp } from "../../shared/math/clamp.ts";
import { GAME_CONFIG } from "../config/game-config.ts";

type ExposedEntity = {
  getComponent(constr: typeof TransformComponent): TransformComponent;
  getComponent(constr: typeof TemperatureComponent): TemperatureComponent;
  getComponent(constr: typeof HealthComponent): HealthComponent;
};

export class ExposureSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly runtime: EcsRuntime;
  private readonly terminator: TerminatorComponent;
  private query: EntityQuery | null = null;

  public constructor(
    terminator: TerminatorComponent,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
    this.terminator = terminator;
  }

  public awake(): void {
    this.query = this.runtime.registry
      .query()
      .with(TransformComponent)
      .with(TemperatureComponent)
      .with(HealthComponent);
  }

  public update(deltaTime: number): void {
    if (!this.query) return;

    for (const entity of this.query.run() as ExposedEntity[]) {
      const transform = entity.getComponent(TransformComponent);
      const temperature = entity.getComponent(TemperatureComponent);
      const health = entity.getComponent(HealthComponent);

      const point = transform.transform.position;
      const outsideBand = this.terminator.distanceOutsideSafeBand(point);

      if (outsideBand <= 0) {
        const recovery = GAME_CONFIG.thermalRecoveryRate * deltaTime;
        if (temperature.thermalBalance > 0) {
          temperature.thermalBalance = Math.max(0, temperature.thermalBalance - recovery);
        } else if (temperature.thermalBalance < 0) {
          temperature.thermalBalance = Math.min(0, temperature.thermalBalance + recovery);
        }
      } else {
        const growth = (GAME_CONFIG.thermalGrowthBase + outsideBand * GAME_CONFIG.thermalGrowthScale) * deltaTime;
        if (this.terminator.getSide(point) === "sun") {
          temperature.thermalBalance = clamp(temperature.thermalBalance + growth, -100, 100);
        } else {
          temperature.thermalBalance = clamp(temperature.thermalBalance - growth, -100, 100);
        }
      }

      temperature.heat = clamp(Math.max(0, temperature.thermalBalance), 0, 100);
      temperature.cold = clamp(Math.max(0, -temperature.thermalBalance), 0, 100);

      if (temperature.heat > GAME_CONFIG.thermalDamageThreshold) {
        health.hp = Math.max(0, health.hp - (temperature.heat - GAME_CONFIG.thermalDamageThreshold) * GAME_CONFIG.thermalDamageRate * deltaTime);
      }

      if (temperature.cold > GAME_CONFIG.thermalDamageThreshold) {
        health.hp = Math.max(0, health.hp - (temperature.cold - GAME_CONFIG.thermalDamageThreshold) * GAME_CONFIG.thermalDamageRate * deltaTime);
      }
    }
  }
}
