import { HudLayoutNodeComponent, HudRenderComponent, Vector2D, type ICamera } from "@claudiu-ceia/tick";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { LootUiComponent, type InventorySlotRef } from "../components/LootUiComponent.ts";
import { ModalStateComponent } from "../components/ModalStateComponent.ts";
import { getItemDefinition, type ItemStack } from "../items/item-catalog.ts";
import { getLootSourceSlotCount, getLootSourceSnapshot, getLootSourceTitle } from "../loot/loot-sources.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { HudButtonEntity } from "./HudButtonEntity.ts";
import {
  BACKPACK_COLUMNS,
  BACKPACK_ORIGIN,
  EQUIPMENT_LAYOUT,
  INVENTORY_LABEL_GAP,
  INVENTORY_MODAL_HEIGHT,
  INVENTORY_MODAL_WIDTH,
  INVENTORY_SECTION_LEFT,
  INVENTORY_SECTION_TOP,
  INVENTORY_SLOT_SIZE,
  QUICKBAR_ORIGIN,
  SOURCE_ORIGIN,
  createGridLayout,
  getSlotRect,
} from "./inventory-layout.ts";
import { canPlaceInventoryStackAt, getInventoryStackAt, isReservedInventorySlot } from "./inventory-slots.ts";
import { drawItemSprite, getItemSheet } from "./item-sprites.ts";

type InventoryModalSnapshot = {
  sourceTitle: string | null;
  sourceSlots: readonly (ItemStack | null)[];
};

const drawSectionTitle = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void => {
  ctx.fillStyle = "rgba(236, 226, 204, 0.76)";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
};

export class LootWindowRenderComponent extends HudRenderComponent {
  private itemSheet: HTMLImageElement | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly lootField: LootFieldComponent,
    private readonly inventory: InventoryComponent,
    private readonly state: LootUiComponent,
    private readonly modalState: ModalStateComponent,
    private readonly closeButton: HudButtonEntity,
  ) {
    super();

    getItemSheet()
      .then((sheet) => {
        this.itemSheet = sheet;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  public override doRender(ctx: CanvasRenderingContext2D, _camera: ICamera, _canvasSize: Vector2D): void {
    const layout = this.ent.getComponent(HudLayoutNodeComponent);
    layout.setSize(this.state.openSource ? INVENTORY_MODAL_WIDTH.withSource : INVENTORY_MODAL_WIDTH.inventoryOnly, INVENTORY_MODAL_HEIGHT);
    const frame = layout.getFrame();
    if (!frame) {
      return;
    }

    const isOpen = this.modalState.activeModal === "inventory";
    this.closeButton.layout.setVisible(isOpen);
    this.closeButton.layout.setInteractive(isOpen);
    if (!isOpen) {
      return;
    }

    const snapshot = this.getSourceSnapshot();

    ctx.fillStyle = "rgba(11, 14, 18, 0.94)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.strokeStyle = "rgba(225, 212, 186, 0.74)";
    ctx.lineWidth = 2;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "#f4eddd";
    ctx.font = "bold 21px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Inventory", frame.x + INVENTORY_SECTION_LEFT, frame.y + 12);

    this.drawEquipmentSection(ctx, frame);
    this.drawQuickbarSection(ctx, frame);
    this.drawBackpackSection(ctx, frame);

    if (snapshot.sourceTitle) {
      this.drawSourceSection(ctx, frame, snapshot);
    }

    this.drawDropFeedback(ctx, frame);
    this.drawTooltip(ctx, frame);
    this.drawDraggedItem(ctx, frame);
  }

  private drawEquipmentSection(ctx: CanvasRenderingContext2D, frame: { x: number; y: number }): void {
    drawSectionTitle(ctx, "Equipment", frame.x + INVENTORY_SECTION_LEFT, frame.y + INVENTORY_SECTION_TOP);
    for (const layout of EQUIPMENT_LAYOUT) {
      this.drawSlot(ctx, frame, layout.ref, layout.x, layout.y, this.getSlotLabel(layout.ref));
    }
  }

  private drawQuickbarSection(ctx: CanvasRenderingContext2D, frame: { x: number; y: number }): void {
    drawSectionTitle(ctx, "Quick Slots", frame.x + QUICKBAR_ORIGIN.x, frame.y + QUICKBAR_ORIGIN.y - INVENTORY_LABEL_GAP);
    const layouts = createGridLayout("quick", this.inventory.quickSlotCount, this.inventory.quickSlotCount, QUICKBAR_ORIGIN.x, QUICKBAR_ORIGIN.y);
    layouts.forEach((layout, index) => {
      this.drawSlot(ctx, frame, layout.ref, layout.x, layout.y, `${index + 1}`);
    });
  }

  private drawBackpackSection(ctx: CanvasRenderingContext2D, frame: { x: number; y: number }): void {
    drawSectionTitle(ctx, "Backpack", frame.x + BACKPACK_ORIGIN.x, frame.y + INVENTORY_SECTION_TOP);
    createGridLayout("backpack", this.inventory.backpackCapacity, BACKPACK_COLUMNS, BACKPACK_ORIGIN.x, BACKPACK_ORIGIN.y).forEach((layout) => {
      this.drawSlot(ctx, frame, layout.ref, layout.x, layout.y);
    });
  }

  private drawSourceSection(ctx: CanvasRenderingContext2D, frame: { x: number; y: number }, snapshot: InventoryModalSnapshot): void {
    drawSectionTitle(ctx, snapshot.sourceTitle ?? "Loot", frame.x + SOURCE_ORIGIN.x, frame.y + INVENTORY_SECTION_TOP);
    createGridLayout("source", snapshot.sourceSlots.length, 4, SOURCE_ORIGIN.x, SOURCE_ORIGIN.y).forEach((layout) => {
      this.drawSlot(ctx, frame, layout.ref, layout.x, layout.y);
    });
  }

  private drawSlot(
    ctx: CanvasRenderingContext2D,
    frame: { x: number; y: number },
    ref: InventorySlotRef,
    x: number,
    y: number,
    label?: string,
  ): void {
    const rect = getSlotRect(frame as never, { ref, x, y });
    const hovered = this.state.hoveredSlot?.section === ref.section && this.state.hoveredSlot.key === ref.key;
    const stack = getInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, ref);
    const draggedStack = this.state.draggedItem?.stack ?? null;
    const hiddenByDrag =
      this.state.draggedItem &&
      this.state.draggedItem.hiddenOrigin !== null &&
      this.state.draggedItem.hiddenOrigin.section === ref.section &&
      this.state.draggedItem.hiddenOrigin.key === ref.key;
    const acceptsDragged =
      draggedStack !== null &&
      isReservedInventorySlot(ref) &&
      canPlaceInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, ref, draggedStack);
    const rejectsDragged =
      hovered &&
      draggedStack !== null &&
      isReservedInventorySlot(ref) &&
      !canPlaceInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, ref, draggedStack);

    ctx.fillStyle = acceptsDragged
      ? "rgba(96, 108, 126, 0.96)"
      : hovered
        ? "rgba(93, 103, 118, 0.92)"
        : "rgba(42, 50, 62, 0.96)";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = acceptsDragged
      ? "rgba(255, 255, 255, 0.98)"
      : rejectsDragged
        ? "rgba(255, 118, 118, 0.95)"
        : hovered
          ? "rgba(252, 240, 213, 0.95)"
          : "rgba(229, 217, 194, 0.55)";
    ctx.lineWidth = acceptsDragged || hovered || rejectsDragged ? 2 : 1;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    if (label) {
      ctx.fillStyle = "rgba(236, 226, 204, 0.62)";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(label, rect.x + 4, rect.y + 4);
    }

    if (!stack || hiddenByDrag) {
      return;
    }

    if (this.itemSheet) {
      const item = getItemDefinition(stack.itemId);
      const iconSize = 34;
      const iconX = Math.floor(rect.x + (rect.width - iconSize) / 2);
      const iconY = Math.floor(rect.y + (rect.height - iconSize) / 2) + 2;
      drawItemSprite(ctx, this.itemSheet, item.spriteIndex, iconX, iconY, iconSize);
    }

    if (stack.count > 1) {
      ctx.fillStyle = "#f7f1e4";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${stack.count}`, rect.x + rect.width - 4, rect.y + rect.height - 4);
    }
  }

  private drawDraggedItem(ctx: CanvasRenderingContext2D, frame: { x: number; y: number }): void {
    if (!this.state.draggedItem || !this.state.dragHudPoint) {
      return;
    }

    const stack = this.state.draggedItem.stack;
    const point = this.state.dragHudPoint;
    const rectX = Math.floor(point.x - INVENTORY_SLOT_SIZE / 2);
    const rectY = Math.floor(point.y - INVENTORY_SLOT_SIZE / 2);

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(42, 50, 62, 0.9)";
    ctx.fillRect(rectX, rectY, INVENTORY_SLOT_SIZE, INVENTORY_SLOT_SIZE);
    ctx.strokeStyle = "rgba(252, 240, 213, 0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(rectX, rectY, INVENTORY_SLOT_SIZE, INVENTORY_SLOT_SIZE);

    if (this.itemSheet) {
      const item = getItemDefinition(stack.itemId);
      const iconSize = 34;
      drawItemSprite(
        ctx,
        this.itemSheet,
        item.spriteIndex,
        Math.floor(rectX + (INVENTORY_SLOT_SIZE - iconSize) / 2),
        Math.floor(rectY + (INVENTORY_SLOT_SIZE - iconSize) / 2) + 2,
        iconSize,
      );
    }
    if (stack.count > 1) {
      ctx.fillStyle = "#f7f1e4";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${stack.count}`, rectX + INVENTORY_SLOT_SIZE - 4, rectY + INVENTORY_SLOT_SIZE - 4);
    }
    ctx.restore();
  }

  private drawTooltip(ctx: CanvasRenderingContext2D, frame: { x: number; y: number; width: number; height: number }): void {
    if (!this.state.hoveredSlot || this.state.draggedItem || !this.state.dragHudPoint) {
      return;
    }

    const stack = getInventoryStackAt(this.inventory, this.state.openSource, this.lootField, this.map, this.state.hoveredSlot);
    if (!stack) {
      return;
    }

    const item = getItemDefinition(stack.itemId);
    const tooltipWidth = 244;
    const tooltipHeight = 66;
    const x = Math.min(frame.x + frame.width - tooltipWidth - 16, this.state.dragHudPoint.x + 18);
    const y = Math.min(frame.y + frame.height - tooltipHeight - 16, this.state.dragHudPoint.y + 18);

    ctx.save();
    ctx.fillStyle = "rgba(10, 12, 16, 0.96)";
    ctx.fillRect(x, y, tooltipWidth, tooltipHeight);
    ctx.strokeStyle = "rgba(232, 219, 191, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, tooltipWidth, tooltipHeight);

    ctx.fillStyle = "#f4eddd";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(item.label.toUpperCase(), x + 12, y + 10);

    ctx.fillStyle = "rgba(236, 226, 204, 0.76)";
    ctx.font = "12px monospace";
    this.drawWrappedText(ctx, item.description, x + 12, y + 32, tooltipWidth - 24, 15);
    ctx.restore();
  }

  private getSourceSnapshot(): InventoryModalSnapshot {
    const source = this.state.openSource;
    if (!source) {
      return { sourceTitle: null, sourceSlots: [] };
    }

    const snapshot = getLootSourceSnapshot(source, this.lootField, this.map);
    if (!snapshot) {
      if (this.state.draggedItem?.hiddenOrigin?.section === "source") {
        return {
          sourceTitle: getLootSourceTitle(source, this.lootField, this.map),
          sourceSlots: Array.from({ length: getLootSourceSlotCount(source, this.lootField, this.map) }, () => null),
        };
      }

      this.state.openSource = null;
      return { sourceTitle: null, sourceSlots: [] };
    }

    return { sourceTitle: snapshot.title, sourceSlots: snapshot.slots };
  }

  private getSlotLabel(ref: InventorySlotRef): string | undefined {
    if (ref.section === "equipment") {
      switch (ref.key) {
        case "mainWeapon":
          return "MAIN";
        case "secondaryWeapon":
          return "SIDE";
        case "helmet":
          return "HELM";
        case "bodyArmor":
          return "BODY";
      }
    }
    if (ref.section === "weaponAmmo") {
      return ref.key === "mainWeaponAmmo" ? "AMMO" : "AMMO";
    }
    return undefined;
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ): void {
    let lineY = y;
    for (const line of this.wrapText(ctx, text, maxWidth)) {
      ctx.fillText(line, x, lineY);
      lineY += lineHeight;
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    if (line) {
      lines.push(line);
    }

    return lines;
  }

  private drawDropFeedback(ctx: CanvasRenderingContext2D, frame: { x: number; y: number; width: number; height: number }): void {
    const message = this.state.getVisibleDropFeedback();
    if (!message) {
      return;
    }

    const paddingX = 14;
    const paddingY = 10;
    const lineHeight = 15;

    ctx.save();
    ctx.font = "12px monospace";
    const width = Math.min(frame.width - 32, 280);
    const lines = this.wrapText(ctx, message, width - paddingX * 2);
    const height = Math.max(30, lines.length * lineHeight + paddingY * 2);
    const x = frame.x + Math.floor((frame.width - width) / 2);
    const y = frame.y + frame.height - height - 16;

    ctx.fillStyle = "rgba(76, 18, 18, 0.94)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(255, 176, 176, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "#fff0f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const textBlockHeight = lines.length * lineHeight;
    let lineY = y + Math.floor((height - textBlockHeight) / 2);
    for (const line of lines) {
      ctx.fillText(line, x + width / 2, lineY);
      lineY += lineHeight;
    }
    ctx.restore();
  }
}
