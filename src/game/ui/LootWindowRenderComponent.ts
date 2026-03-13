import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { HudButtonEntity } from "./HudButtonEntity.ts";
import { getItemDefinition, type ItemStack } from "../items/item-catalog.ts";
import { getLootSourceSnapshot } from "../loot/loot-sources.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import {
  LOOT_WINDOW_COLUMNS,
  LOOT_WINDOW_GRID,
  LOOT_WINDOW_ROWS,
  LOOT_WINDOW_SLOT_COUNT,
} from "./loot-window-layout.ts";
import { drawItemSprite, getItemSheet } from "./item-sprites.ts";

export type LootWindowSnapshot = {
  title: string;
  slots: readonly (ItemStack | null)[];
};

export class LootWindowRenderComponent extends HudRenderComponent {
  private itemSheet: HTMLImageElement | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly lootField: LootFieldComponent,
    private readonly state: LootUiComponent,
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

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) return;

    const loot = this.getLoot();
    this.closeButton.layout.setVisible(loot !== null);
    this.closeButton.layout.setInteractive(loot !== null);
    if (!loot) {
      return;
    }

    ctx.fillStyle = "rgba(11, 14, 18, 0.92)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.strokeStyle = "rgba(225, 212, 186, 0.74)";
    ctx.lineWidth = 2;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "#f4eddd";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(loot.title, frame.x + LOOT_WINDOW_GRID.x, frame.y + 12);

    ctx.fillStyle = "rgba(236, 226, 204, 0.72)";
    ctx.font = "14px monospace";
    ctx.fillText("Click items to collect.", frame.x + LOOT_WINDOW_GRID.x, frame.y + 34);

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
          const iconSize = 42;
          const iconX = Math.floor(x + (LOOT_WINDOW_GRID.slotSize - iconSize) / 2);
          const iconY = Math.floor(y + (LOOT_WINDOW_GRID.slotSize - iconSize) / 2) - 2;
          drawItemSprite(ctx, this.itemSheet, item.spriteIndex, iconX, iconY, iconSize);
        }

        ctx.fillStyle = "#f7f1e4";
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${stack.count}`, x + LOOT_WINDOW_GRID.slotSize - 5, y + LOOT_WINDOW_GRID.slotSize - 5);
      }
    }

    const occupied = loot.slots.reduce((count, stack) => count + (stack ? 1 : 0), 0);
    const totalItems = loot.slots.reduce((count, stack) => count + (stack?.count ?? 0), 0);
    ctx.fillStyle = "rgba(233, 223, 201, 0.72)";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Stacks: ${occupied}/${LOOT_WINDOW_SLOT_COUNT}`, frame.x + LOOT_WINDOW_GRID.x, frame.y + frame.height - 52);
    ctx.fillText(`Total items: ${totalItems}`, frame.x + LOOT_WINDOW_GRID.x, frame.y + frame.height - 34);
  }

  private getLoot(): LootWindowSnapshot | null {
    const source = this.state.openSource;
    if (!source) {
      return null;
    }

    const snapshot = getLootSourceSnapshot(source, this.lootField, this.map);
    if (!snapshot) {
      this.state.close();
      return null;
    }

    return {
      title: snapshot.title,
      slots: snapshot.slots,
    };
  }
}
