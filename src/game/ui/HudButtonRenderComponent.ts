import { HudLayoutNodeComponent, HudRenderComponent, Vector2D, type ICamera } from "@claudiu-ceia/tick";
import { HudButtonStateComponent } from "./HudButtonStateComponent.ts";

export type HudButtonRenderOptions = {
  label: string;
};

export class HudButtonRenderComponent extends HudRenderComponent {
  public constructor(private readonly options: HudButtonRenderOptions) {
    super();
  }

  public override doRender(ctx: CanvasRenderingContext2D, _camera: ICamera, _canvasSize: Vector2D): void {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) {
      return;
    }

    const state = this.ent.getComponent(HudButtonStateComponent);
    ctx.save();
    ctx.fillStyle = state.pressed
      ? "rgba(156, 74, 64, 0.96)"
      : state.hovered
        ? "rgba(182, 90, 78, 0.96)"
        : "rgba(122, 56, 50, 0.9)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.strokeStyle = state.hovered ? "rgba(248, 228, 205, 0.9)" : "rgba(230, 206, 180, 0.58)";
    ctx.lineWidth = state.hovered ? 2 : 1.5;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "rgba(247, 239, 225, 0.96)";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.options.label, frame.x + frame.width / 2, frame.y + frame.height / 2 + 1);
    ctx.restore();
  }
}
