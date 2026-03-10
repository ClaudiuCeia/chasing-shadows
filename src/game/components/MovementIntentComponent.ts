import { Component } from "@claudiu-ceia/tick";

export class MovementIntentComponent extends Component {
  public static type = "movement-intent";

  public x = 0;
  public y = 0;
  public sprint = false;
  public targetX: number | null = null;
  public targetY: number | null = null;

  public setIntent(x: number, y: number, sprint: boolean): void {
    this.x = x;
    this.y = y;
    this.sprint = sprint;
  }

  public setMoveTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public clearMoveTarget(): void {
    this.targetX = null;
    this.targetY = null;
  }
}
