import { describe, expect, test } from "bun:test";
import { InventoryComponent } from "./InventoryComponent.ts";
import { ItemTransferSystem } from "../systems/ItemTransferSystem.ts";

describe("InventoryComponent", () => {
  test("setSlots pads to capacity with null", () => {
    const inventory = new InventoryComponent(4);
    inventory.setSlots([{ itemId: "wire", count: 2 }]);

    expect(inventory.getSlots()).toEqual([
      { itemId: "wire", count: 2 },
      null,
      null,
      null,
    ]);
  });

  test("adds into existing stack before using empty slot", () => {
    const inventory = new InventoryComponent(2);
    inventory.setSlots([{ itemId: "wire", count: 2 }, null]);

    const remaining = ItemTransferSystem.addItem(inventory, "wire", 3);
    expect(remaining).toBe(0);
    expect(inventory.getSlots()[0]).toEqual({ itemId: "wire", count: 5 });
    expect(inventory.getSlots()[1]).toBeNull();
  });

  test("returns leftover when inventory is full", () => {
    const inventory = new InventoryComponent(3);
    inventory.setSlots([
      { itemId: "wire", count: 1 },
      { itemId: "water", count: 1 },
      { itemId: "ration", count: 1 },
    ]);

    const remaining = ItemTransferSystem.addItem(inventory, "fiber", 4);
    expect(remaining).toBe(4);
    expect(inventory.getSlots()[2]).toEqual({ itemId: "ration", count: 1 });
  });
});
