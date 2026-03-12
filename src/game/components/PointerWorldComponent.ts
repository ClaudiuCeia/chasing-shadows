import { Component, Vector2D } from "@claudiu-ceia/tick";

export type PointerWorldActionPhase = "press" | "hold" | "release" | null;
export type PointerWorldActionMode = "interaction" | "attack" | null;

export class PointerWorldComponent extends Component {
  public worldPoint: Vector2D | null = null;
  public canvasPoint: Vector2D | null = null;
  public elevation = 0;
  public phase: PointerWorldActionPhase = null;
  public mode: PointerWorldActionMode = null;
  public blockedByHud = false;

  public setResolved(worldPoint: Vector2D, canvasPoint: Vector2D, elevation: number): void {
    this.worldPoint = worldPoint;
    this.canvasPoint = canvasPoint;
    this.elevation = elevation;
  }

  public clearResolved(): void {
    this.worldPoint = null;
    this.canvasPoint = null;
    this.elevation = 0;
  }
}
