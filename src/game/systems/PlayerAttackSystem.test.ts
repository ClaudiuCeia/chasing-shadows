import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Entity, World } from "@claudiu-ceia/tick";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { DRY_FIRE_FEEDBACK_SECONDS, PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { getItemRefireSeconds } from "../items/item-catalog.ts";
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
  test("syncs fire mode from the active weapon", () => {
    const attack = new PlayerAttackComponent();
    const inventory = new InventoryComponent(8);

    inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
    PlayerAttackSystem.syncFireModeFromInventory(attack, inventory);
    expect(attack.fireMode).toBe("semi");
    expect(attack.refireSeconds).toBe(getItemRefireSeconds("shotgun"));

    inventory.setEquipmentSlot("mainWeapon", { itemId: "ump5", count: 1 });
    PlayerAttackSystem.syncFireModeFromInventory(attack, inventory);
    expect(attack.fireMode).toBe("auto");
    expect(attack.refireSeconds).toBe(getItemRefireSeconds("ump5"));
  });

  test("assigns distinct refire timings per weapon", () => {
    expect(getItemRefireSeconds("ump5")).toBeLessThan(getItemRefireSeconds("pistol"));
    expect(getItemRefireSeconds("pistol")).toBeLessThan(getItemRefireSeconds("shotgun"));
  });

  test("consumes ammo for semi-auto attacks", () => {
    const attack = new PlayerAttackComponent();
    const inventory = new InventoryComponent(8);

    inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
    inventory.setWeaponAmmoSlot("mainWeaponAmmo", { itemId: "shotgun-ammo", count: 2 });
    PlayerAttackSystem.syncFireModeFromInventory(attack, inventory);

    expect(PlayerAttackSystem.handleTrigger(attack, "attack1", 0, 1, "press", inventory)).toBeTrue();
    expect(inventory.getWeaponAmmoSlot("mainWeaponAmmo")).toEqual({ itemId: "shotgun-ammo", count: 1 });
  });

  test("dry fires when the active ranged weapon has no ammo", () => {
    const attack = new PlayerAttackComponent();
    const inventory = new InventoryComponent(8);

    inventory.setEquipmentSlot("secondaryWeapon", { itemId: "pistol", count: 1 });
    inventory.setActiveSlot("secondary");
    PlayerAttackSystem.syncFireModeFromInventory(attack, inventory);

    expect(PlayerAttackSystem.handleTrigger(attack, "attack1", 0, 1, "press", inventory)).toBeFalse();
    expect(attack.active).toBeFalse();
    expect(attack.dryFireFeedbackRemaining).toBe(DRY_FIRE_FEEDBACK_SECONDS);
    expect(inventory.getActiveWeaponAmmoCount()).toBe(0);
  });

  test("auto fire consumes ammo on refire and dry fires when empty", () => {
    const attack = new PlayerAttackComponent();
    const inventory = new InventoryComponent(8);

    inventory.setEquipmentSlot("mainWeapon", { itemId: "ump5", count: 1 });
    inventory.setWeaponAmmoSlot("mainWeaponAmmo", { itemId: "pistol-ammo", count: 2 });
    PlayerAttackSystem.syncFireModeFromInventory(attack, inventory);

    expect(PlayerAttackSystem.handleTrigger(attack, "runAttack", 2, 1, "press", inventory)).toBeTrue();
    expect(inventory.getWeaponAmmoSlot("mainWeaponAmmo")).toEqual({ itemId: "pistol-ammo", count: 1 });

    expect(PlayerAttackSystem.handleTrigger(attack, "runAttack", 2, 1, "hold", inventory)).toBeTrue();
    expect(inventory.getWeaponAmmoSlot("mainWeaponAmmo")).toEqual({ itemId: "pistol-ammo", count: 1 });

    attack.refireRemaining = 0;
    expect(PlayerAttackSystem.handleTrigger(attack, "runAttack", 2, 1, "hold", inventory)).toBeTrue();
    expect(inventory.getWeaponAmmoSlot("mainWeaponAmmo")).toBeNull();

    attack.refireRemaining = 0;
    expect(PlayerAttackSystem.handleTrigger(attack, "runAttack", 2, 1, "hold", inventory)).toBeFalse();
    expect(attack.active).toBeFalse();
    expect(attack.dryFireFeedbackRemaining).toBe(DRY_FIRE_FEEDBACK_SECONDS);
  });

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
