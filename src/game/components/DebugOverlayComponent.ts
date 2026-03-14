import { Component } from "@claudiu-ceia/tick";

export class DebugOverlayComponent extends Component {
  public enabled = false;
  public renderLosRays = true;
  public renderCombatRays = true;

  public toggle(): void {
    this.enabled = !this.enabled;
  }

  public toggleLosRays(): void {
    this.renderLosRays = !this.renderLosRays;
  }

  public toggleCombatRays(): void {
    this.renderCombatRays = !this.renderCombatRays;
  }
}
