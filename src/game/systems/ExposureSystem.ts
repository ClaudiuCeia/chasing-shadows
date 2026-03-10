import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { HealthComponent } from "../components/HealthComponent.ts";
import { TemperatureComponent } from "../components/TemperatureComponent.ts";
import type { TerminatorModel } from "../world/TerminatorModel.ts";

type ExposedEntity = {
  getComponent(constr: typeof TransformComponent): TransformComponent;
  getComponent(constr: typeof TemperatureComponent): TemperatureComponent;
  getComponent(constr: typeof HealthComponent): HealthComponent;
};

const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const clampBalance = (value: number): number => Math.max(-100, Math.min(100, value));

export class ExposureSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly runtime: EcsRuntime;
  private readonly terminator: TerminatorModel;
  private query: EntityQuery | null = null;

  public constructor(
    terminator: TerminatorModel,
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
        const recovery = 5.5 * deltaTime;
        if (temperature.thermalBalance > 0) {
          temperature.thermalBalance = Math.max(0, temperature.thermalBalance - recovery);
        } else if (temperature.thermalBalance < 0) {
          temperature.thermalBalance = Math.min(0, temperature.thermalBalance + recovery);
        }
      } else {
        const growth = (2.2 + outsideBand * 0.9) * deltaTime;
        if (this.terminator.getSide(point) === "sun") {
          temperature.thermalBalance = clampBalance(temperature.thermalBalance + growth);
        } else {
          temperature.thermalBalance = clampBalance(temperature.thermalBalance - growth);
        }
      }

      temperature.heat = clamp(Math.max(0, temperature.thermalBalance));
      temperature.cold = clamp(Math.max(0, -temperature.thermalBalance));

      if (temperature.heat > 80) {
        health.hp = Math.max(0, health.hp - (temperature.heat - 80) * 0.05 * deltaTime);
      }

      if (temperature.cold > 80) {
        health.hp = Math.max(0, health.hp - (temperature.cold - 80) * 0.05 * deltaTime);
      }
    }
  }
}
