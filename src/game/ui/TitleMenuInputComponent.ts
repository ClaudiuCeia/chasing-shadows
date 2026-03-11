import { HudInputComponent, HudLayoutNodeComponent, type HudInputEvent } from "@claudiu-ceia/tick";
import { TitleMenuState, type TitleMenuAction } from "./TitleMenuState.ts";
import { getTitleOverlayActionAtPoint } from "./title-overlay-layout.ts";

export class TitleMenuInputComponent extends HudInputComponent {
  public constructor(
    private readonly state: TitleMenuState,
    private readonly onContinue: () => void,
    private readonly onNew: () => void,
  ) {
    super();
    this.focusable = true;
    this.keyboardMode = "global";
  }

  private resolveAction(event: HudInputEvent): TitleMenuAction {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame || !event.hudPoint) {
      return null;
    }

    return getTitleOverlayActionAtPoint(frame, event.hudPoint.x, event.hudPoint.y);
  }

  private activate(action: TitleMenuAction): void {
    if (action === "continue") {
      this.onContinue();
      return;
    }

    if (action === "new") {
      this.onNew();
    }
  }

  protected override onPointerMove(event: HudInputEvent): void {
    this.state.hoveredAction = this.resolveAction(event);
    event.stopPropagation();
  }

  protected override onPointerLeave(event: HudInputEvent): void {
    this.state.hoveredAction = null;
    this.state.pressedAction = null;
    event.stopPropagation();
  }

  protected override onPointerDown(event: HudInputEvent): void {
    this.state.pressedAction = this.resolveAction(event);
    event.stopPropagation();
  }

  protected override onPointerUp(event: HudInputEvent): void {
    this.state.pressedAction = null;
    event.stopPropagation();
  }

  protected override onClick(event: HudInputEvent): void {
    this.activate(this.resolveAction(event));
    event.stopPropagation();
  }

  protected override onKeyDown(event: HudInputEvent): void {
    if (event.key === "Enter" || event.key === "Escape") {
      this.onContinue();
      event.stopPropagation();
      return;
    }

    if (event.key === "r" || event.key === "R") {
      this.onNew();
      event.stopPropagation();
    }
  }
}
