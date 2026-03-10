import { Entity, TransformComponent, Vector2D, type ICamera } from "@claudiu-ceia/tick";
import { isoToWorld, worldToIso, type IsoConfig } from "../../shared/math/iso.ts";

export class IsometricCameraEntity extends Entity implements ICamera {
  public readonly transform: TransformComponent;

  private readonly isoConfig: IsoConfig;

  public constructor(isoConfig: IsoConfig) {
    super();
    this.isoConfig = isoConfig;
    this.transform = new TransformComponent({
      position: new Vector2D(0, 0),
      rotation: 0,
      scale: 1,
    });
    this.addComponent(this.transform);
  }

  public override update(_deltaTime: number): void {}

  public toCanvas(worldPos: Vector2D, canvasSize: Vector2D): Vector2D {
    const cameraIso = worldToIso(this.transform.transform.position, this.isoConfig);
    const targetIso = worldToIso(worldPos, this.isoConfig);

    return new Vector2D(
      targetIso.x - cameraIso.x + canvasSize.x / 2,
      targetIso.y - cameraIso.y + canvasSize.y / 2,
    );
  }

  public canvasToWorld(canvasPos: Vector2D, canvasSize: Vector2D): Vector2D {
    const cameraIso = worldToIso(this.transform.transform.position, this.isoConfig);
    const iso = new Vector2D(
      canvasPos.x - canvasSize.x / 2 + cameraIso.x,
      canvasPos.y - canvasSize.y / 2 + cameraIso.y,
    );
    return isoToWorld(iso, this.isoConfig);
  }
}
