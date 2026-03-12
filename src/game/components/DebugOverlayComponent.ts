import { Component } from "@claudiu-ceia/tick";

export type DebugRayPoint = {
  x: number;
  y: number;
  z: number;
};

export type DebugRayState = {
  origin: DebugRayPoint;
  end: DebugRayPoint;
  hit: DebugRayPoint | null;
  hitDistance: number | null;
};

export class DebugOverlayComponent extends Component {
  public enabled = false;
  public playerElevation = 0;
  public headElevation = 0;
  public ray: DebugRayState | null = null;

  public setPlayerElevations(playerElevation: number, headElevation: number): void {
    this.playerElevation = playerElevation;
    this.headElevation = headElevation;
  }

  public setRay(ray: DebugRayState | null): void {
    this.ray = ray;
  }

  public clear(): void {
    this.ray = null;
  }

  public toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.clear();
    }
  }
}
