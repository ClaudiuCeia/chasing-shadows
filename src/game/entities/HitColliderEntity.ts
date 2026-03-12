import { CollisionEntity, type CollisionAnchor, type CollisionShape } from "@claudiu-ceia/tick";

export class HitColliderEntity extends CollisionEntity {
  public bodyHeight: number;

  public constructor(shape: CollisionShape, anchorPoint: CollisionAnchor, layer: number, bodyHeight: number) {
    super(shape, anchorPoint, layer, 0);
    this.bodyHeight = Math.max(0.1, bodyHeight);
  }

  public setBodyHeight(bodyHeight: number): void {
    this.bodyHeight = Math.max(0.1, bodyHeight);
  }
}
