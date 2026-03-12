import { RectangleCollisionShape, Vector2D } from "@claudiu-ceia/tick";
import { IsometricRenderNodeComponent } from "../components/IsometricRenderNodeComponent.ts";
import { LootBoxSpriteComponent } from "../render/LootBoxSpriteComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { ObstacleEntity } from "./ObstacleEntity.ts";

const LOOT_BOX_COLLIDER_SIZE = 0.8;

export class LootBoxEntity extends ObstacleEntity {
  public readonly tile: TilePositionComponent;
  public readonly sprite: LootBoxSpriteComponent;

  public constructor(tileX: number, tileY: number, spriteIndex: number, tileZ = 0) {
    super({
      position: new Vector2D(tileX, tileY),
      shape: new RectangleCollisionShape(LOOT_BOX_COLLIDER_SIZE, LOOT_BOX_COLLIDER_SIZE),
    });
    this.tile = new TilePositionComponent(tileX, tileY, tileZ);
    this.sprite = new LootBoxSpriteComponent(spriteIndex);

    this.addComponent(new IsometricRenderNodeComponent());
    this.addComponent(this.tile);
    this.addComponent(this.sprite);
  }

  public override update(_dt: number): void {}
}
