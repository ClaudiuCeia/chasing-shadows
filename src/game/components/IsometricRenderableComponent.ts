import { Component, Vector2D } from "@claudiu-ceia/tick";

export abstract class IsometricRenderableComponent extends Component {
  public static type = "isometric-renderable";
  public sortOffset = 0;

  public abstract renderIsometric(
    ctx: CanvasRenderingContext2D,
    screen: Vector2D,
    isSelected: boolean,
  ): void;
}
