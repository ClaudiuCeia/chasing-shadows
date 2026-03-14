import { SystemPhase, SystemTickMode, TransformComponent, type System } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";

export type CameraFollowSystemOptions = {
  followStrength?: number;
};

export class CameraFollowSystem implements System {
  public readonly phase = SystemPhase.Render;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly followStrength: number;

  public constructor(
    private readonly camera: IsometricCameraEntity,
    private readonly player: PlayerEntity,
    options: CameraFollowSystemOptions,
  ) {
    this.followStrength = Math.max(0.1, options.followStrength ?? 9);
  }

  public update(deltaTime: number): void {
    const dt = Math.max(0, deltaTime);
    const cameraPos = this.camera.transform.transform.position;
    const playerPos = this.player.getComponent(TransformComponent).transform.position;
    const alpha = Math.min(1, dt * this.followStrength);
    this.camera.transform.setPosition(cameraPos.lerp(playerPos, alpha));
  }
}
