import { describe, expect, test } from "bun:test";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { createTileBoxLootSource } from "../loot/loot-sources.ts";
import { canPlaceInventoryStackAt, combineInventoryStacks, setInventoryStackAt } from "./inventory-slots.ts";

describe("inventory-slots", () => {
  test("equipment slots clamp stacks to a single item", () => {
    const inventory = new InventoryComponent(4);
    const lootField = new LootFieldComponent({ seed: 1 });
    const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });

    setInventoryStackAt(inventory, null, lootField, map, { section: "equipment", key: "mainWeapon" }, { itemId: "pistol", count: 3 });

    expect(inventory.getEquipmentSlot("mainWeapon")).toEqual({ itemId: "pistol", count: 1 });
  });

  test("stacking slots merge counts for matching items", () => {
    expect(combineInventoryStacks({ itemId: "water-bottle", count: 2 }, { itemId: "water-bottle", count: 3 })).toEqual({
      itemId: "water-bottle",
      count: 5,
    });
  });

  test("can restore an item back into an emptied loot source", () => {
    const inventory = new InventoryComponent(4);
    const lootField = new LootFieldComponent({ seed: 1 });
    const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
    const source = createTileBoxLootSource(1, 1);

    lootField.setSlots(1, 1, [{ itemId: "knife", count: 1 }, ...Array.from({ length: 15 }, () => null)]);
    setInventoryStackAt(inventory, source, lootField, map, { section: "source", key: 0 }, null);

    expect(lootField.getBoxAt(1, 1, map)?.slots.every((slot) => slot === null)).toBeTrue();

    setInventoryStackAt(inventory, source, lootField, map, { section: "source", key: 0 }, { itemId: "knife", count: 1 });

    expect(lootField.getBoxAt(1, 1, map)?.slots[0]).toEqual({ itemId: "knife", count: 1 });
  });

  test("weapon ammo slots only accept ammo matching their equipped weapon", () => {
    const inventory = new InventoryComponent(4);
    const lootField = new LootFieldComponent({ seed: 1 });
    const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });

    inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });
    inventory.setEquipmentSlot("secondaryWeapon", { itemId: "pistol", count: 1 });

    expect(
      canPlaceInventoryStackAt(
        inventory,
        null,
        lootField,
        map,
        { section: "weaponAmmo", key: "mainWeaponAmmo" },
        { itemId: "shotgun-ammo", count: 3 },
      ),
    ).toBeTrue();
    expect(
      canPlaceInventoryStackAt(
        inventory,
        null,
        lootField,
        map,
        { section: "weaponAmmo", key: "mainWeaponAmmo" },
        { itemId: "pistol-ammo", count: 3 },
      ),
    ).toBeFalse();
    expect(
      canPlaceInventoryStackAt(
        inventory,
        null,
        lootField,
        map,
        { section: "weaponAmmo", key: "secondaryWeaponAmmo" },
        { itemId: "pistol-ammo", count: 3 },
      ),
    ).toBeTrue();
  });
});
