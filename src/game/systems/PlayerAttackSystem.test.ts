import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Entity, World } from "@claudiu-ceia/tick";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { ATTACK_SEMI_END_FRAME } from "../render/player-animation-logic.ts";
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
    PlayerAttackSystem.toggleFireMode(entity.attack);
    expect(entity.attack.fireMode).toBe("semi");
    expect(PlayerAttackSystem.handleTrigger(entity.attack, "attack1", 3, 1, "press")).toBeTrue();

    world.step(1 / 4);
    expect(entity.attack.active).toBeTrue();
    expect(entity.attack.getFrameIndex()).toBeGreaterThan(0);

    stepN(world, 6, 1 / 4);
    expect(entity.attack.active).toBeFalse();
    expect(entity.attack.getFrameIndex()).toBe(ATTACK_SEMI_END_FRAME);
  });

  test("keeps looping in auto mode while held", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    expect(PlayerAttackSystem.handleTrigger(entity.attack, "runAttack", 2, 1, "press")).toBeTrue();

    world.step(2);

    expect(entity.attack.active).toBeTrue();
    expect(entity.attack.getFrameIndex()).toBeGreaterThanOrEqual(1);
  });

  test("auto mode release cancels looping attack", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    expect(PlayerAttackSystem.handleTrigger(entity.attack, "runAttack", 2, 1, "press")).toBeTrue();

    world.step(0.2);
    PlayerAttackSystem.handleTrigger(entity.attack, null, null, null, "release");

    expect(entity.attack.active).toBeFalse();
    expect(entity.attack.frameCursor).toBe(0);
  });

  test("semi-auto requires release before next shot", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    PlayerAttackSystem.toggleFireMode(entity.attack);

    expect(PlayerAttackSystem.handleTrigger(entity.attack, "attack1", 1, 1, "press")).toBeTrue();
    stepN(world, 6, 1 / 4);
    expect(PlayerAttackSystem.handleTrigger(entity.attack, "attack1", 1, 1, "press")).toBeFalse();

    PlayerAttackSystem.handleTrigger(entity.attack, null, null, null, "release");
    expect(PlayerAttackSystem.handleTrigger(entity.attack, "attack1", 1, 1, "press")).toBeTrue();
  });

  test("semi-auto release does not cancel current shot", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    PlayerAttackSystem.toggleFireMode(entity.attack);

    expect(PlayerAttackSystem.handleTrigger(entity.attack, "attack1", 1, 1, "press")).toBeTrue();
    PlayerAttackSystem.handleTrigger(entity.attack, null, null, null, "release");
    expect(entity.attack.active).toBeTrue();
    expect(entity.attack.releasedSinceLastShot).toBeFalse();
    expect(entity.attack.releaseQueued).toBeTrue();

    stepN(world, 6, 1 / 4);
    expect(entity.attack.active).toBeFalse();
    expect(entity.attack.releasedSinceLastShot).toBeTrue();
    expect(entity.attack.releaseQueued).toBeFalse();
  });

  test("semi-auto cannot retrigger until queued release finishes the shot", () => {
    const world = new World({ fixedDeltaTime: 1 / 60 });
    world.addSystem(new PlayerAttackSystem());

    const entity = new AttackEntity();
    entity.awake();
    PlayerAttackSystem.toggleFireMode(entity.attack);

    expect(PlayerAttackSystem.handleTrigger(entity.attack, "attack1", 1, 1, "press")).toBeTrue();
    PlayerAttackSystem.handleTrigger(entity.attack, null, null, null, "release");
    const frameCursorBeforeRetrigger = entity.attack.frameCursor;

    expect(PlayerAttackSystem.handleTrigger(entity.attack, "attack1", 1, 1, "press")).toBeTrue();
    expect(entity.attack.frameCursor).toBe(frameCursorBeforeRetrigger);
    expect(entity.attack.releasedSinceLastShot).toBeFalse();

    stepN(world, 6, 1 / 4);
    expect(PlayerAttackSystem.handleTrigger(entity.attack, "attack1", 1, 1, "press")).toBeTrue();
  });
});
