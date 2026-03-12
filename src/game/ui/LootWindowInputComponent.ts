import { HudInputComponent, HudLayoutNodeComponent, type HudInputEvent } from "@claudiu-ceia/tick";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { getLootSlotAtHudPoint } from "./loot-window-layout.ts";

export class LootWindowInputComponent extends HudInputComponent {
  public constructor(
    private readonly state: LootUiComponent,
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

    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame || !event.hudPoint) {
      this.state.hoveredSlot = null;
      return;
    }

    const slot = getLootSlotAtHudPoint(frame, event.hudPoint.x, event.hudPoint.y);
    this.state.hoveredSlot = slot;
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
      this.state.pendingSlotClick = slot;
    }
  }

  protected override onKeyDown(event: HudInputEvent): void {
    if (!this.isOpen()) {
      return;
    }

    if (event.key === "Escape") {
      event.stopPropagation();
      this.state.close();
    }
  }

  private isOpen(): boolean {
    return this.state.openBox !== null;
  }
}
