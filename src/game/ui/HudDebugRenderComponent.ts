import { HudLayoutNodeComponent, HudRenderComponent, Vector2D, type ICamera } from "@claudiu-ceia/tick";
import { DebugOverlayComponent } from "../components/DebugOverlayComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";

export class HudDebugRenderComponent extends HudRenderComponent {
  public constructor(
    private readonly debug: DebugOverlayComponent,
    private readonly player: PlayerEntity,
  ) {
    super();
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    if (!this.debug.enabled) {
      return;
    }

    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) {
      return;
    }

    const position = this.player.transform.transform.position;
    const primaryRay = this.player.rayEmitter.getPrimaryRay();
    const posture = this.player.getComponent(MovementIntentComponent).crouch ? "crouched" : "standing";
    const playerElevation = this.player.tilePosition.z;
    const headElevation = playerElevation + this.player.hitCollider.bodyHeight;
    const lines = [
      `Posture: ${posture}`,
      `Player x: ${position.x.toFixed(2)}`,
      `Player y: ${position.y.toFixed(2)}`,
      `Player z: ${playerElevation.toFixed(2)}`,
      `Head z: ${headElevation.toFixed(2)}`,
      `Rays: ${this.player.rayEmitter.rayCount}`,
      primaryRay?.hit ? `Hit: ${primaryRay.hit.type} @ ${primaryRay.hit.distance.toFixed(2)}` : `Range: ${primaryRay?.distance.toFixed(2) ?? "-"}`,
    ];

    ctx.save();
    ctx.fillStyle = "rgba(12, 14, 18, 0.74)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
    ctx.strokeStyle = "rgba(224, 215, 194, 0.24)";
    ctx.lineWidth = 1;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "rgba(242, 232, 214, 0.94)";
    ctx.font = "600 14px Georgia";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, index) => {
      ctx.fillText(line, frame.x + 10, frame.y + 8 + index * 18);
    });
    ctx.restore();
  }
}
