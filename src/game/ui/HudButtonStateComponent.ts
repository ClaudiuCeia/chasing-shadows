import { Component } from "@claudiu-ceia/tick";

export class HudButtonStateComponent extends Component {
  public hovered = false;
  public pressed = false;

  public reset(): void {
    this.hovered = false;
    this.pressed = false;
  }
}
