import { Entity } from "@claudiu-ceia/tick";
import { IsometricRenderNodeComponent } from "../components/IsometricRenderNodeComponent.ts";
import { LootBoxSpriteComponent } from "../render/LootBoxSpriteComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";

export class LootBoxEntity extends Entity {
  public readonly tile: TilePositionComponent;
  public readonly sprite: LootBoxSpriteComponent;

  public constructor(tileX: number, tileY: number, spriteIndex: number, tileZ = 0) {
    super();
    this.tile = new TilePositionComponent(tileX, tileY, tileZ);
    this.sprite = new LootBoxSpriteComponent(spriteIndex);

    this.addComponent(new IsometricRenderNodeComponent());
    this.addComponent(this.tile);
    this.addComponent(this.sprite);
  }

  public override update(_dt: number): void {}
}
