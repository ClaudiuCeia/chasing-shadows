import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import { getItemDefinition, type ItemStack } from "../items/item-catalog.ts";
import { LootUiState } from "../state/LootUiState.ts";
import {
  LOOT_WINDOW_COLUMNS,
  LOOT_WINDOW_GRID,
  LOOT_WINDOW_ROWS,
  LOOT_WINDOW_SLOT_COUNT,
} from "./loot-window-layout.ts";
import { drawItemSprite, getItemSheet } from "./item-sprites.ts";

export type LootWindowSnapshot = {
  x: number;
  y: number;
  slots: readonly (ItemStack | null)[];
};

export class LootWindowRenderComponent extends HudRenderComponent {
  private itemSheet: HTMLImageElement | null = null;

  public constructor(
    private readonly getLoot: () => LootWindowSnapshot | null,
    private readonly state: LootUiState,
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

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) return;

    const loot = this.getLoot();
    if (!loot) {
      return;
    }

    ctx.fillStyle = "rgba(11, 14, 18, 0.92)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.strokeStyle = "rgba(225, 212, 186, 0.74)";
    ctx.lineWidth = 2;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "#f4eddd";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Loot Box (${loot.x}, ${loot.y})`, frame.x + 24, frame.y + 18);

    ctx.fillStyle = "rgba(236, 226, 204, 0.72)";
    ctx.font = "17px monospace";
    ctx.fillText("Click items to collect.", frame.x + 24, frame.y + 52);
    ctx.fillText("Press E while near a box to open it.", frame.x + 24, frame.y + 74);

    const stride = LOOT_WINDOW_GRID.slotSize + LOOT_WINDOW_GRID.gap;
    for (let row = 0; row < LOOT_WINDOW_ROWS; row++) {
      for (let col = 0; col < LOOT_WINDOW_COLUMNS; col++) {
        const slot = row * LOOT_WINDOW_COLUMNS + col;
        const x = frame.x + LOOT_WINDOW_GRID.x + col * stride;
        const y = frame.y + LOOT_WINDOW_GRID.y + row * stride;

        const highlighted = this.state.hoveredSlot === slot;
        ctx.fillStyle = highlighted ? "rgba(93, 103, 118, 0.94)" : "rgba(44, 52, 64, 0.96)";
        ctx.fillRect(x, y, LOOT_WINDOW_GRID.slotSize, LOOT_WINDOW_GRID.slotSize);

        ctx.strokeStyle = highlighted ? "rgba(252, 240, 213, 0.95)" : "rgba(229, 217, 194, 0.67)";
        ctx.lineWidth = highlighted ? 2 : 1.5;
        ctx.strokeRect(x, y, LOOT_WINDOW_GRID.slotSize, LOOT_WINDOW_GRID.slotSize);

        const stack = loot.slots[slot] ?? null;
        if (!stack) {
          continue;
        }

        if (this.itemSheet) {
          const item = getItemDefinition(stack.itemId);
          const iconSize = 52;
          const iconX = Math.floor(x + (LOOT_WINDOW_GRID.slotSize - iconSize) / 2);
          const iconY = Math.floor(y + (LOOT_WINDOW_GRID.slotSize - iconSize) / 2) - 2;
          drawItemSprite(ctx, this.itemSheet, item.spriteIndex, iconX, iconY, iconSize);
        }

        ctx.fillStyle = "#f7f1e4";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${stack.count}`, x + LOOT_WINDOW_GRID.slotSize - 5, y + LOOT_WINDOW_GRID.slotSize - 5);
      }
    }

    const occupied = loot.slots.reduce((count, stack) => count + (stack ? 1 : 0), 0);
    const totalItems = loot.slots.reduce((count, stack) => count + (stack?.count ?? 0), 0);
    ctx.fillStyle = "rgba(233, 223, 201, 0.72)";
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Stacks: ${occupied}/${LOOT_WINDOW_SLOT_COUNT}`, frame.x + 24, frame.y + frame.height - 42);
    ctx.fillText(`Total items: ${totalItems}`, frame.x + 24, frame.y + frame.height - 22);
  }
}
