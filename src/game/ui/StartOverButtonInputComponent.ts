import { HudInputComponent, type HudInputEvent } from "@claudiu-ceia/tick";
import type { HudButtonVisualState } from "./HudButtonVisualState.ts";

export class StartOverButtonInputComponent extends HudInputComponent {
  public constructor(
    private readonly state: HudButtonVisualState,
    private readonly onStartOver: () => void,
  ) {
    super();
    this.focusable = true;
    this.keyboardMode = "global";
  }

  protected override onPointerEnter(_event: HudInputEvent): void {
    this.state.hovered = true;
  }

  protected override onPointerLeave(_event: HudInputEvent): void {
    this.state.hovered = false;
    this.state.pressed = false;
  }

  protected override onPointerDown(event: HudInputEvent): void {
    this.state.pressed = true;
    event.stopPropagation();
  }

  protected override onPointerUp(event: HudInputEvent): void {
    this.state.pressed = false;
    event.stopPropagation();
  }

  protected override onClick(event: HudInputEvent): void {
    event.stopPropagation();
    this.onStartOver();
  }

  protected override onKeyDown(event: HudInputEvent): void {
    if (event.key === "r" || event.key === "R") {
      event.stopPropagation();
      this.onStartOver();
    }
  }
}
