import { Entity, RectangleCollisionShape, TransformComponent, Vector2D } from "@claudiu-ceia/tick";
import { COLLISION_LAYER_OBSTACLE } from "../collision/collision-layers.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { HitColliderEntity } from "./HitColliderEntity.ts";

export type StructureHitVolumeEntityOptions = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  bodyHeight: number;
};

export class StructureHitVolumeEntity extends Entity {
  public readonly transform: TransformComponent;
  public readonly tile: TilePositionComponent;
  public readonly hitCollider: HitColliderEntity;
  private readonly width: number;
  private readonly height: number;

  public constructor(options: StructureHitVolumeEntityOptions) {
    super();
    this.width = options.width;
    this.height = options.height;
    this.transform = new TransformComponent({
      position: new Vector2D(options.x, options.y),
      rotation: 0,
      scale: 1,
    });
    this.tile = new TilePositionComponent(options.x, options.y, options.z);
    this.hitCollider = new HitColliderEntity(
      new RectangleCollisionShape(options.width, options.height),
      "top-left",
      COLLISION_LAYER_OBSTACLE,
      options.bodyHeight,
    );

    this.addComponent(this.transform);
    this.addComponent(this.tile);
    this.addChild(this.hitCollider);
    this.syncHitCollider();
  }

  public syncHitCollider(): void {
    const transform = this.hitCollider.getComponent(TransformComponent);
    transform.parent = null;
    transform.setPosition(this.tile.x - this.width / 2, this.tile.y - this.height / 2);
    transform.setRotation(0);
    this.hitCollider.setBodyHeight(this.hitCollider.bodyHeight);
  }

  public override awake(): void {
    super.awake();
    this.syncHitCollider();
  }

  public override update(dt: number): void {
    super.update(dt);
    this.syncHitCollider();
  }
}
