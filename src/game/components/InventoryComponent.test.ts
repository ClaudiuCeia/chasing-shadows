import { describe, expect, test } from "bun:test";
import { InventoryComponent } from "./InventoryComponent.ts";
import { ItemTransferSystem } from "../systems/ItemTransferSystem.ts";

describe("InventoryComponent", () => {
  test("pads backpack and quick slots to configured capacity", () => {
    const inventory = new InventoryComponent(4, 2);
    inventory.setState({
      activeSlot: "quick2",
      quickSlots: [{ itemId: "water-bottle", count: 1 }],
      backpackSlots: [{ itemId: "body-armor", count: 2 }],
    });

    expect(inventory.getActiveSlot()).toBe("quick2");
    expect(inventory.getQuickSlots()).toEqual([{ itemId: "water-bottle", count: 1 }, null]);
    expect(inventory.getBackpackSlots()).toEqual([
      { itemId: "body-armor", count: 2 },
      null,
      null,
      null,
    ]);
  });

  test("defaults active slot to primary when state omits it", () => {
    const inventory = new InventoryComponent(4, 2);

    inventory.setState({
      quickSlots: [
        { itemId: "water-bottle", count: 1 },
        { itemId: "bandage", count: 1 },
      ],
    });

    expect(inventory.getActiveSlot()).toBe("primary");
  });

  test("adds into existing backpack stack before using empty slot", () => {
    const inventory = new InventoryComponent(2);
    inventory.setBackpackSlots([{ itemId: "body-armor", count: 2 }, null]);

    const remaining = ItemTransferSystem.addItem(inventory, "body-armor", 3);
    expect(remaining).toBe(0);
    expect(inventory.getBackpackSlots()[0]).toEqual({ itemId: "body-armor", count: 5 });
    expect(inventory.getBackpackSlots()[1]).toBeNull();
  });

  test("returns leftover when backpack is full", () => {
    const inventory = new InventoryComponent(3);
    inventory.setBackpackSlots([
      { itemId: "body-armor", count: 1 },
      { itemId: "water-bottle", count: 1 },
      { itemId: "shotgun-ammo", count: 1 },
    ]);

    const remaining = ItemTransferSystem.addItem(inventory, "ump5", 4);
    expect(remaining).toBe(4);
    expect(inventory.getBackpackSlots()[2]).toEqual({ itemId: "shotgun-ammo", count: 1 });
  });

  test("consumes ammo from the active primary weapon slot", () => {
    const inventory = new InventoryComponent(4);
    inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
    inventory.setWeaponAmmoSlot("mainWeaponAmmo", { itemId: "shotgun-ammo", count: 2 });

    expect(inventory.consumeAmmoForActiveWeapon()).toBeTrue();
    expect(inventory.getActiveWeaponAmmoCount()).toBe(1);
    expect(inventory.getWeaponAmmoSlot("mainWeaponAmmo")).toEqual({
      itemId: "shotgun-ammo",
      count: 1,
    });
  });

  test("consumes ammo from the active secondary weapon slot", () => {
    const inventory = new InventoryComponent(4);
    inventory.setEquipmentSlot("secondaryWeapon", { itemId: "pistol", count: 1 });
    inventory.setWeaponAmmoSlot("secondaryWeaponAmmo", { itemId: "pistol-ammo", count: 1 });
    inventory.setActiveSlot("secondary");

    expect(inventory.consumeAmmoForActiveWeapon()).toBeTrue();
    expect(inventory.getWeaponAmmoSlot("secondaryWeaponAmmo")).toBeNull();
  });

  test("fails to consume ammo when the equipped ranged weapon has no matching ammo", () => {
    const inventory = new InventoryComponent(4);
    inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
    inventory.setWeaponAmmoSlot("mainWeaponAmmo", { itemId: "pistol-ammo", count: 3 });

    expect(inventory.consumeAmmoForActiveWeapon()).toBeFalse();
    expect(inventory.getActiveWeaponAmmoCount()).toBe(0);
    expect(inventory.getWeaponAmmoSlot("mainWeaponAmmo")).toEqual({
      itemId: "pistol-ammo",
      count: 3,
    });
  });

  test("does not require ammo for melee weapons", () => {
    const inventory = new InventoryComponent(4);
    inventory.setEquipmentSlot("mainWeapon", { itemId: "knife", count: 1 });

    expect(inventory.consumeAmmoForActiveWeapon()).toBeTrue();
    expect(inventory.getActiveWeaponAmmoCount()).toBeNull();
  });
});
