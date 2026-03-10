import { Entity, TransformComponent, Vector2D, type ICamera } from "@claudiu-ceia/tick";
import { isoToWorld, worldToIso, type IsoConfig } from "../../shared/math/iso.ts";

export class IsometricCameraEntity extends Entity implements ICamera {
  public readonly transform: TransformComponent;

  private readonly isoConfig: IsoConfig;
  private readonly elevationStepPixels: number;

  public constructor(isoConfig: IsoConfig, elevationStepPixels = isoConfig.tileHeight / 4) {
    super();
    this.isoConfig = isoConfig;
    this.elevationStepPixels = Math.max(1, elevationStepPixels);
    this.transform = new TransformComponent({
      position: new Vector2D(0, 0),
      rotation: 0,
      scale: 1,
    });
    this.addComponent(this.transform);
  }

  public override update(_deltaTime: number): void {}

  public toCanvas(worldPos: Vector2D, canvasSize: Vector2D): Vector2D {
    return this.toCanvasAt(worldPos, 0, canvasSize);
  }

  public toCanvasAt(worldPos: Vector2D, elevation: number, canvasSize: Vector2D): Vector2D {
    const cameraIso = worldToIso(this.transform.transform.position, this.isoConfig);
    const targetIso = worldToIso(worldPos, this.isoConfig);
    const liftedY = targetIso.y - elevation * this.elevationStepPixels;

    return new Vector2D(
      targetIso.x - cameraIso.x + canvasSize.x / 2,
      liftedY - cameraIso.y + canvasSize.y / 2,
    );
  }

  public getElevationStepPixels(): number {
    return this.elevationStepPixels;
  }

  public canvasToWorld(canvasPos: Vector2D, canvasSize: Vector2D): Vector2D {
    return this.canvasToWorldAt(canvasPos, 0, canvasSize);
  }

  public canvasToWorldAt(canvasPos: Vector2D, elevation: number, canvasSize: Vector2D): Vector2D {
    const cameraIso = worldToIso(this.transform.transform.position, this.isoConfig);
    const liftedIsoY = cameraIso.y + elevation * this.elevationStepPixels;
    const iso = new Vector2D(
      canvasPos.x - canvasSize.x / 2 + cameraIso.x,
      canvasPos.y - canvasSize.y / 2 + liftedIsoY,
    );
    return isoToWorld(iso, this.isoConfig);
  }
}
