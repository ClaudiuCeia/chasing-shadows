import { Entity } from "@claudiu-ceia/tick";
import { IsometricRenderNodeComponent } from "../components/IsometricRenderNodeComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { IsometricRenderableComponent } from "../components/IsometricRenderableComponent.ts";

export class StructureVisualEntity extends Entity {
  public readonly tile: TilePositionComponent;

  public constructor(x: number, y: number, z: number, renderable: IsometricRenderableComponent) {
    super();
    this.tile = new TilePositionComponent(x, y, z);

    this.addComponent(new IsometricRenderNodeComponent());
    this.addComponent(this.tile);
    this.addComponent(renderable);
  }
}
