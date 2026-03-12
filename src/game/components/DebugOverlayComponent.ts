import { Component } from "@claudiu-ceia/tick";

export class DebugOverlayComponent extends Component {
  public enabled = false;

  public toggle(): void {
    this.enabled = !this.enabled;
  }
}
