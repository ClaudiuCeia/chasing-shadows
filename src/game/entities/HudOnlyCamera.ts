import { Entity, Vector2D } from "@claudiu-ceia/tick";

export class HudOnlyCamera extends Entity {
  public toCanvas(worldPos: Vector2D): Vector2D {
    return worldPos;
  }

  public override update(_dt: number): void {}
}
