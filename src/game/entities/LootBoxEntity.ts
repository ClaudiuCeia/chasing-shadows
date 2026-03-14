import { RectangleCollisionShape, Vector2D } from "@claudiu-ceia/tick";
import { GAME_CONFIG } from "../config/game-config.ts";
import { HighlightComponent } from "../components/HighlightComponent.ts";
import { InteractableComponent } from "../components/InteractableComponent.ts";
import { IsometricRenderNodeComponent } from "../components/IsometricRenderNodeComponent.ts";
import { StaticWorldObjectComponent } from "../components/StaticWorldObjectComponent.ts";
import { LootBoxSpriteComponent } from "../render/LootBoxSpriteComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { ObstacleEntity } from "./ObstacleEntity.ts";

const LOOT_BOX_COLLIDER_SIZE = 0.8;

export class LootBoxEntity extends ObstacleEntity {
  public readonly interactable: InteractableComponent;
  public readonly highlight: HighlightComponent;
  public readonly tile: TilePositionComponent;
  public readonly sprite: LootBoxSpriteComponent;

  public constructor(tileX: number, tileY: number, spriteIndex: number, tileZ = 0) {
    super({
      position: new Vector2D(tileX, tileY),
      shape: new RectangleCollisionShape(LOOT_BOX_COLLIDER_SIZE, LOOT_BOX_COLLIDER_SIZE),
    });
    this.interactable = new InteractableComponent("loot", GAME_CONFIG.lootBoxInteractRange);
    this.highlight = new HighlightComponent("loot-outline");
    this.tile = new TilePositionComponent(tileX, tileY, tileZ);
    this.sprite = new LootBoxSpriteComponent(spriteIndex);

    this.addComponent(this.interactable);
    this.addComponent(this.highlight);
    this.addComponent(new StaticWorldObjectComponent("loot-box"));
    this.addComponent(new IsometricRenderNodeComponent());
    this.addComponent(this.tile);
    this.addComponent(this.sprite);
  }

  public override update(dt: number): void {
    super.update(dt);
  }
}
