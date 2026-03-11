import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Entity, World } from "@claudiu-ceia/tick";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { PlayerAttackSystem } from "./PlayerAttackSystem.ts";

class AttackEntity extends Entity {
  public readonly attack = new PlayerAttackComponent();

  public constructor() {
    super();
    this.addComponent(this.attack);
  }

  public override update(_dt: number): void {}
}

beforeEach(() => {
  EcsRuntime.reset();
});

const stepN = (world: World, n: number, dt: number): void => {
  for (let i = 0; i < n; i++) {
    world.step(dt);
  }
};

describe("PlayerAttackSystem", () => {
  test("advances and completes semi-auto attacks", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    entity.attack.toggleFireMode();
    expect(entity.attack.fireMode).toBe("semi");
    expect(entity.attack.handleTrigger("attack1", 3, 1, "press")).toBeTrue();

    world.step(1 / 4);
    expect(entity.attack.active).toBeTrue();
    expect(entity.attack.getFrameIndex()).toBeGreaterThan(0);

    stepN(world, 6, 1 / 4);
    expect(entity.attack.active).toBeFalse();
  });

  test("keeps looping in auto mode while held", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    expect(entity.attack.handleTrigger("runAttack", 2, 1, "press")).toBeTrue();

    world.step(2);

    expect(entity.attack.active).toBeTrue();
    expect(entity.attack.getFrameIndex()).toBeGreaterThanOrEqual(1);
  });

  test("semi-auto requires release before next shot", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    entity.attack.toggleFireMode();

    expect(entity.attack.handleTrigger("attack1", 1, 1, "press")).toBeTrue();
    stepN(world, 6, 1 / 4);
    expect(entity.attack.handleTrigger("attack1", 1, 1, "press")).toBeFalse();

    entity.attack.handleTrigger(null, null, null, "release");
    expect(entity.attack.handleTrigger("attack1", 1, 1, "press")).toBeTrue();
  });

  test("semi-auto release does not cancel current shot", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    entity.attack.toggleFireMode();

    expect(entity.attack.handleTrigger("attack1", 1, 1, "press")).toBeTrue();
    entity.attack.handleTrigger(null, null, null, "release");
    expect(entity.attack.active).toBeTrue();

    stepN(world, 6, 1 / 4);
    expect(entity.attack.active).toBeFalse();
  });
});
