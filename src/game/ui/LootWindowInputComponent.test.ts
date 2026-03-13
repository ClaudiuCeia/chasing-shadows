import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Entity, HudLayoutNodeComponent, Vector2D } from "@claudiu-ceia/tick";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { ModalStateComponent } from "../components/ModalStateComponent.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { BACKPACK_ORIGIN, EQUIPMENT_LAYOUT, INVENTORY_MODAL_HEIGHT, INVENTORY_MODAL_WIDTH, INVENTORY_SLOT_SIZE } from "./inventory-layout.ts";
import { restoreDraggedInventoryItem } from "./inventory-slots.ts";
import { LootWindowInputComponent } from "./LootWindowInputComponent.ts";

class HudNode extends Entity {
  public override update(dt: number): void {
    super.update(dt);
  }
}

const clickEventAt = (x: number, y: number) => ({
  type: "click",
  hudPoint: new Vector2D(x, y),
  stopPropagation() {},
}) as any;

beforeEach(() => {
  EcsRuntime.reset();
});

describe("LootWindowInputComponent", () => {
  test("stack dropped onto occupied weapon slot swaps one item and restore resets state", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const inventory = new InventoryComponent(16, 4);
      inventory.setBackpackSlots([{ itemId: "ump5", count: 5 }, ...Array.from({ length: 15 }, () => null)]);
      inventory.setEquipmentSlot("mainWeapon", { itemId: "shotgun", count: 1 });

      const lootUi = new LootUiComponent();
      const modalState = new ModalStateComponent();
      modalState.open("inventory");
      const lootField = new LootFieldComponent({ seed: 1 });
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });

      const node = new HudNode();
      const layout = new HudLayoutNodeComponent({
        width: INVENTORY_MODAL_WIDTH.inventoryOnly,
        height: INVENTORY_MODAL_HEIGHT,
        anchor: "center",
      });
      const input = new LootWindowInputComponent(lootUi, modalState, inventory, lootField, map);
      node.addComponent(layout);
      node.addComponent(input);
      node.awake();
      layout.setResolvedFrame({ x: 0, y: 0, width: INVENTORY_MODAL_WIDTH.inventoryOnly, height: INVENTORY_MODAL_HEIGHT });

      const backpackPoint = new Vector2D(BACKPACK_ORIGIN.x + INVENTORY_SLOT_SIZE / 2, BACKPACK_ORIGIN.y + INVENTORY_SLOT_SIZE / 2);
      const weaponSlot = EQUIPMENT_LAYOUT[0]!;
      const weaponPoint = new Vector2D(weaponSlot.x + INVENTORY_SLOT_SIZE / 2, weaponSlot.y + INVENTORY_SLOT_SIZE / 2);

      input.handleHudInput(clickEventAt(backpackPoint.x, backpackPoint.y));
      expect(lootUi.draggedItem?.stack).toEqual({ itemId: "ump5", count: 5 });

      input.handleHudInput(clickEventAt(weaponPoint.x, weaponPoint.y));

      expect(inventory.getEquipmentSlot("mainWeapon")).toEqual({ itemId: "ump5", count: 1 });
      expect(inventory.getBackpackSlots()[0]).toEqual({ itemId: "ump5", count: 4 });
      expect(lootUi.draggedItem?.stack).toEqual({ itemId: "shotgun", count: 1 });

      restoreDraggedInventoryItem(lootUi, inventory, lootField, map);

      expect(inventory.getEquipmentSlot("mainWeapon")).toEqual({ itemId: "shotgun", count: 1 });
      expect(inventory.getBackpackSlots()[0]).toEqual({ itemId: "ump5", count: 5 });
      expect(lootUi.draggedItem).toBeNull();
    });
  });
});
