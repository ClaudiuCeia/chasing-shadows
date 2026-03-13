import { HudInputComponent, HudLayoutNodeComponent, type HudInputEvent } from "@claudiu-ceia/tick";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { ModalStateComponent } from "../components/ModalStateComponent.ts";
import { getLootSourceSlotCount, getLootSourceSnapshot } from "../loot/loot-sources.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { getInventorySlotAtHudPoint, INVENTORY_MODAL_HEIGHT, INVENTORY_MODAL_WIDTH } from "./inventory-layout.ts";
import {
  canPlaceInventoryStackAt,
  combineInventoryStacks,
  getInventoryStackAt,
  isSingleItemInventorySlot,
  isStackingInventorySlot,
  restoreDraggedInventoryItem,
  setInventoryStackAt,
} from "./inventory-slots.ts";

export class LootWindowInputComponent extends HudInputComponent {
  public constructor(
    private readonly state: LootUiComponent,
    private readonly modalState: ModalStateComponent,
    private readonly inventory: InventoryComponent,
    private readonly lootField: LootFieldComponent,
    private readonly map: InfiniteTilemap,
  ) {
    super();
    this.focusable = true;
    this.keyboardMode = "global";
  }

  protected override onPointerLeave(_event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }
    this.state.hoveredSlot = null;
  }

  protected override onPointerMove(event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const layout = this.ent.getComponent(HudLayoutNodeComponent);
    layout.setSize(this.state.openSource ? INVENTORY_MODAL_WIDTH.withSource : INVENTORY_MODAL_WIDTH.inventoryOnly, INVENTORY_MODAL_HEIGHT);
    const frame = layout.getFrame();
    if (!frame || !event.hudPoint) {
      this.state.hoveredSlot = null;
      return;
    }

    this.state.dragHudPoint = event.hudPoint;
    this.state.hoveredSlot = getInventorySlotAtHudPoint(
      frame,
      event.hudPoint.x,
      event.hudPoint.y,
      this.inventory.quickSlotCount,
      this.inventory.backpackCapacity,
      this.getSourceCount(),
    );
  }

  protected override onClick(event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const layout = this.ent.getComponent(HudLayoutNodeComponent);
    layout.setSize(this.state.openSource ? INVENTORY_MODAL_WIDTH.withSource : INVENTORY_MODAL_WIDTH.inventoryOnly, INVENTORY_MODAL_HEIGHT);
    const frame = layout.getFrame();
    if (!frame || !event.hudPoint) {
      return;
    }

    const target = getInventorySlotAtHudPoint(
      frame,
      event.hudPoint.x,
      event.hudPoint.y,
      this.inventory.quickSlotCount,
      this.inventory.backpackCapacity,
      this.getSourceCount(),
    );
    this.state.dragHudPoint = event.hudPoint;
    if (!target) {
      return;
    }

    event.stopPropagation();

    if (!this.state.draggedItem) {
      const stack = getInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, target);
      if (!stack) {
        return;
      }

      if (!this.state.dragSnapshot) {
        this.state.dragSnapshot = {
          inventory: this.inventory.getState(),
          source: this.state.openSource,
          sourceSlots: this.state.openSource
            ? [...(getLootSourceSnapshot(this.state.openSource, this.lootField, this.map)?.slots ?? [])]
            : null,
        };
      }

      this.state.draggedItem = { hiddenOrigin: target, stack };
      return;
    }

    const dragging = this.state.draggedItem;
    if (dragging.hiddenOrigin && dragging.hiddenOrigin.section === target.section && dragging.hiddenOrigin.key === target.key) {
      this.state.draggedItem = null;
      this.state.dragSnapshot = null;
      return;
    }

    const targetStack = getInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, target);
    if (!canPlaceInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, target, dragging.stack)) {
      return;
    }

    if (isStackingInventorySlot(target) && targetStack?.itemId === dragging.stack.itemId) {
      const merged = combineInventoryStacks(targetStack, dragging.stack);
      if (!merged) {
        return;
      }

      if (dragging.hiddenOrigin) {
        setInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, dragging.hiddenOrigin, null);
      }
      setInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, target, merged);
      this.state.draggedItem = null;
      this.state.dragSnapshot = null;
      return;
    }

    if (isSingleItemInventorySlot(target) && dragging.stack.count > 1) {
      const updatedDraggedCount = dragging.stack.count - 1;

      if (dragging.hiddenOrigin) {
        setInventoryStackAt(
          this.inventory,
          this.state.openSource,
          this.lootField,
          this.map,
          dragging.hiddenOrigin,
          updatedDraggedCount > 0 ? { itemId: dragging.stack.itemId, count: updatedDraggedCount } : null,
        );
      }

      setInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, target, {
        itemId: dragging.stack.itemId,
        count: 1,
      });

      if (!targetStack) {
        if (updatedDraggedCount > 0) {
          dragging.stack = { itemId: dragging.stack.itemId, count: updatedDraggedCount };
        } else {
          this.state.draggedItem = null;
          this.state.dragSnapshot = null;
        }
        return;
      }

      this.state.draggedItem = { hiddenOrigin: null, stack: targetStack };
      if (updatedDraggedCount <= 0) {
        this.state.draggedItem = null;
      }
      return;
    }

    if (
      targetStack &&
      dragging.hiddenOrigin &&
      !canPlaceInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, dragging.hiddenOrigin, targetStack)
    ) {
      return;
    }

    if (dragging.hiddenOrigin) {
      setInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, dragging.hiddenOrigin, targetStack);
    }
    setInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, target, dragging.stack);
    this.state.draggedItem = targetStack ? { hiddenOrigin: null, stack: targetStack } : null;
    if (!this.state.draggedItem) {
      this.state.dragSnapshot = null;
    }
  }

  protected override onKeyDown(event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }

    if (event.key === "Escape" || event.key === "i" || event.key === "I") {
      event.stopPropagation();
      restoreDraggedInventoryItem(this.state, this.inventory, this.lootField, this.map);
      this.state.close();
      this.modalState.close("inventory");
    }
  }

  private getSourceCount(): number {
    if (!this.state.openSource) {
      return 0;
    }
    if (this.state.draggedItem?.hiddenOrigin?.section === "source") {
      return getLootSourceSlotCount(this.state.openSource, this.lootField, this.map);
    }
    return getLootSourceSnapshot(this.state.openSource, this.lootField, this.map)?.slots.length ?? 0;
  }

  private isOpen(): boolean {
    return this.modalState.activeModal === "inventory";
  }
}
