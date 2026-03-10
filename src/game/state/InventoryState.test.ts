import { describe, expect, test } from "bun:test";
import { InventoryState } from "./InventoryState.ts";

describe("InventoryState", () => {
  test("stacks duplicate item types in one slot", () => {
    const inventory = new InventoryState(8);
    expect(inventory.addItem("wire", 2)).toBe(0);
    expect(inventory.addItem("wire", 5)).toBe(0);

    const slot = inventory.getSlots()[0];
    expect(slot?.itemId).toBe("wire");
    expect(slot?.count).toBe(7);
  });

  test("returns leftovers when inventory has no free slot", () => {
    const inventory = new InventoryState(2);
    inventory.addItem("wire", 1);
    inventory.addItem("battery", 1);

    expect(inventory.addItem("fuel", 4)).toBe(4);
  });

  test("hydrates from snapshot values", () => {
    const inventory = new InventoryState(3);
    inventory.hydrate([
      { itemId: "ice", count: 3 },
      null,
      { itemId: "ration", count: 2 },
    ]);

    expect(inventory.getSlots()[0]?.count).toBe(3);
    expect(inventory.getSlots()[2]?.itemId).toBe("ration");
  });
});
