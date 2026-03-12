import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { getItemDefinition } from "../items/item-catalog.ts";
import { drawItemSprite, getItemSheet } from "./item-sprites.ts";

const SLOT_GAP = 6;
const SLOT_COUNT = 8;

export class QuickbarRenderComponent extends HudRenderComponent {
  private itemSheet: HTMLImageElement | null = null;

  public constructor(private readonly inventory: InventoryComponent) {
    super();

    getItemSheet()
      .then((sheet) => {
        this.itemSheet = sheet;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) return;

    ctx.fillStyle = "rgba(18, 20, 24, 0.68)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.strokeStyle = "rgba(228, 214, 189, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    const innerWidth = frame.width - 20;
    const slotSize = Math.floor((innerWidth - SLOT_GAP * (SLOT_COUNT - 1)) / SLOT_COUNT);
    const slots = this.inventory.getSlots();
    const totalWidth = slotSize * SLOT_COUNT + SLOT_GAP * (SLOT_COUNT - 1);
    const startX = Math.floor(frame.x + (frame.width - totalWidth) / 2);
    const y = Math.floor(frame.y + (frame.height - slotSize) / 2);

    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = startX + i * (slotSize + SLOT_GAP);
      ctx.fillStyle = "rgba(46, 54, 66, 0.95)";
      ctx.fillRect(x, y, slotSize, slotSize);

      ctx.strokeStyle = "rgba(244, 233, 207, 0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, slotSize, slotSize);

      ctx.fillStyle = "rgba(233, 222, 196, 0.8)";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`${i + 1}`, x + 4, y + 3);

      const stack = slots[i];
      if (!stack) {
        continue;
      }

      if (this.itemSheet) {
        const sprite = getItemDefinition(stack.itemId);
        const iconSize = Math.floor(slotSize * 0.58);
        const iconX = Math.floor(x + (slotSize - iconSize) / 2);
        const iconY = Math.floor(y + (slotSize - iconSize) / 2) + 2;
        drawItemSprite(ctx, this.itemSheet, sprite.spriteIndex, iconX, iconY, iconSize);
      }

      if (stack.count > 1) {
        ctx.fillStyle = "#f6f0e1";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${stack.count}`, x + slotSize - 5, y + slotSize - 4);
      }
    }
  }
}
