import { HudInputComponent, type HudInputEvent } from "@claudiu-ceia/tick";
import { HudButtonStateComponent } from "./HudButtonStateComponent.ts";

export class HudButtonInputComponent extends HudInputComponent {
  public constructor(private readonly onClickAction: () => void) {
    super();
  }

  protected override onPointerEnter(_event: HudInputEvent): void {
    this.ent.getComponent(HudButtonStateComponent).hovered = true;
  }

  protected override onPointerLeave(_event: HudInputEvent): void {
    this.ent.getComponent(HudButtonStateComponent).reset();
  }

  protected override onPointerDown(event: HudInputEvent): void {
    this.ent.getComponent(HudButtonStateComponent).pressed = true;
    event.stopPropagation();
  }

  protected override onPointerUp(event: HudInputEvent): void {
    this.ent.getComponent(HudButtonStateComponent).pressed = false;
    event.stopPropagation();
  }

  protected override onClick(event: HudInputEvent): void {
    this.ent.getComponent(HudButtonStateComponent).pressed = false;
    event.stopPropagation();
    this.onClickAction();
  }
}
