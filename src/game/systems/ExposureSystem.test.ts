import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Entity, TransformComponent, Vector2D, World } from "@claudiu-ceia/tick";
import { HealthComponent } from "../components/HealthComponent.ts";
import { TerminatorComponent } from "../components/TerminatorComponent.ts";
import { TemperatureComponent } from "../components/TemperatureComponent.ts";
import { ExposureSystem } from "./ExposureSystem.ts";

class ExposedEntity extends Entity {
  public readonly transform: TransformComponent;
  public readonly temperature: TemperatureComponent;
  public readonly health: HealthComponent;

  public constructor(position: Vector2D) {
    super();
    this.transform = new TransformComponent({ position, rotation: 0, scale: 1 });
    this.temperature = new TemperatureComponent();
    this.health = new HealthComponent();
    this.addComponent(this.transform);
    this.addComponent(this.temperature);
    this.addComponent(this.health);
  }

  public override update(_dt: number): void {}
}

const stepN = (world: World, n: number, dt: number, entity: ExposedEntity): void => {
  for (let i = 0; i < n; i++) {
    world.step(dt);
    expect(entity.temperature.heat > 0 && entity.temperature.cold > 0).toBe(false);
  }
};

beforeEach(() => {
  EcsRuntime.reset();
});

describe("ExposureSystem", () => {
  test("keeps thermal load in one direction at a time", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    const terminator = new TerminatorComponent({ safeBandHalfWidth: 0.5, travelSpeed: 0 });
    world.addSystem(new ExposureSystem(terminator));

    const entity = new ExposedEntity(new Vector2D(5, 0));
    entity.awake();

    stepN(world, 180, 1 / 60, entity);
    expect(entity.temperature.heat).toBeGreaterThan(0);
    expect(entity.temperature.cold).toBe(0);

    entity.transform.setPosition(new Vector2D(-5, 0));
    stepN(world, 220, 1 / 60, entity);
    expect(entity.temperature.cold).toBeGreaterThan(0);
    expect(entity.temperature.heat).toBe(0);
  });
});
