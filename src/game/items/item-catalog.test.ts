import { describe, expect, test } from "bun:test";
import {
  canWeaponUseAmmo,
  getItemDefinition,
  getWeaponAccuracy,
  getWeaponBaseDamage,
  getWeaponCombatStats,
  getWeaponSpreadDegrees,
  isRangedWeaponItemDefinition,
} from "./item-catalog.ts";

describe("item-catalog", () => {
  test("exposes typed combat stats for ranged weapons", () => {
    const pistol = getItemDefinition("pistol");
    expect(isRangedWeaponItemDefinition(pistol)).toBeTrue();
    if (!isRangedWeaponItemDefinition(pistol)) {
      throw new Error("Expected pistol to be a ranged weapon definition");
    }
    expect(getWeaponCombatStats("pistol")).toEqual({
      baseDamage: pistol.baseDamage,
      spreadDegrees: pistol.spreadDegrees,
      accuracy: pistol.accuracy,
      fireMode: pistol.fireMode,
      refireSeconds: pistol.refireSeconds,
      usesAmmo: pistol.usesAmmo,
    });
    expect(getWeaponBaseDamage("pistol")).toBeGreaterThan(0);
    expect(getWeaponSpreadDegrees("shotgun")).toBeGreaterThan(getWeaponSpreadDegrees("pistol"));
    expect(getWeaponAccuracy("ump5")).toBeLessThan(1);
  });

  test("does not expose combat stats for melee items", () => {
    const knife = getItemDefinition("knife");
    expect(isRangedWeaponItemDefinition(knife)).toBeFalse();
    expect(getWeaponCombatStats("knife")).toBeNull();
    expect(getWeaponBaseDamage("knife")).toBe(0);
  });

  test("matches ammo compatibility through the discriminated union", () => {
    expect(canWeaponUseAmmo("pistol", "pistol-ammo")).toBeTrue();
    expect(canWeaponUseAmmo("pistol", "shotgun-ammo")).toBeFalse();
    expect(canWeaponUseAmmo("knife", "pistol-ammo")).toBeFalse();
  });
});
