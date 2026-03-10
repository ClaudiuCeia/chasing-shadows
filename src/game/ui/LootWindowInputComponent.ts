import { HudInputComponent, HudLayoutNodeComponent, type HudInputEvent } from "@claudiu-ceia/tick";
import { LootUiState } from "../state/LootUiState.ts";
import { getLootSlotAtHudPoint } from "./loot-window-layout.ts";

export class LootWindowInputComponent extends HudInputComponent {
  public constructor(
    private readonly state: LootUiState,
    private readonly isOpen: () => boolean,
    private readonly onLootSlotClick: (slot: number) => void,
    private readonly onClose: () => void,
  ) {
    super();
    this.focusable = true;
    this.keyboardMode = "global";
  }

  protected override onPointerLeave(_event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }

    this.state.setHoveredSlot(null);
  }

  protected override onPointerMove(event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame || !event.hudPoint) {
      this.state.setHoveredSlot(null);
      return;
    }

    const slot = getLootSlotAtHudPoint(frame, event.hudPoint.x, event.hudPoint.y);
    this.state.setHoveredSlot(slot);
  }

  protected override onClick(event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }

    event.stopPropagation();

    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame || !event.hudPoint) {
      return;
    }

    const slot = getLootSlotAtHudPoint(frame, event.hudPoint.x, event.hudPoint.y);
    if (slot !== null) {
      this.onLootSlotClick(slot);
    }
  }

  protected override onKeyDown(event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }

    if (event.key === "Escape") {
      event.stopPropagation();
      this.onClose();
    }
  }
}
