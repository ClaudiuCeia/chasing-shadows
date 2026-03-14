import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import { GAME_CONFIG } from "../config/game-config.ts";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { getItemDefinition } from "../items/item-catalog.ts";
import { drawItemSprite, getItemSheet } from "./item-sprites.ts";

const SLOT_GAP = 6;
const SLOT_COUNT = 4;

type QuickbarSlotView = {
  keyLabel: string;
  roleLabel: string;
  active: boolean;
  stack: ReturnType<InventoryComponent["getEquipmentSlot"]>;
};

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
    const slots: QuickbarSlotView[] = [
      {
        keyLabel: "1",
        roleLabel: "PRI",
        active: this.inventory.getActiveSlot() === "primary",
        stack: this.inventory.getEquipmentSlot("mainWeapon"),
      },
      {
        keyLabel: "2",
        roleLabel: "SEC",
        active: this.inventory.getActiveSlot() === "secondary",
        stack: this.inventory.getEquipmentSlot("secondaryWeapon"),
      },
      {
        keyLabel: "3",
        roleLabel: "Q1",
        active: this.inventory.getActiveSlot() === "quick1",
        stack: this.inventory.getQuickSlots()[0] ?? null,
      },
      {
        keyLabel: "4",
        roleLabel: "Q2",
        active: this.inventory.getActiveSlot() === "quick2",
        stack: this.inventory.getQuickSlots()[1] ?? null,
      },
    ];
    const totalWidth = slotSize * SLOT_COUNT + SLOT_GAP * (SLOT_COUNT - 1);
    const startX = Math.floor(frame.x + (frame.width - totalWidth) / 2);
    const y = Math.floor(frame.y + (frame.height - slotSize) / 2);

    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = slots[i]!;
      const x = startX + i * (slotSize + SLOT_GAP);
      ctx.fillStyle = slot.active ? "rgba(82, 90, 106, 0.98)" : "rgba(46, 54, 66, 0.95)";
      ctx.fillRect(x, y, slotSize, slotSize);

      ctx.strokeStyle = slot.active ? "rgba(255, 244, 214, 0.96)" : "rgba(244, 233, 207, 0.55)";
      ctx.lineWidth = slot.active ? 2 : 1;
      ctx.strokeRect(x, y, slotSize, slotSize);

      ctx.fillStyle = "rgba(233, 222, 196, 0.8)";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(slot.keyLabel, x + 4, y + 3);

      ctx.textAlign = "right";
      ctx.fillText(slot.roleLabel, x + slotSize - 4, y + 3);

      const stack = slot.stack;
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
