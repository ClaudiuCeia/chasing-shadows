import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import type { HudButtonVisualState } from "./HudButtonVisualState.ts";

export class HudButtonRenderComponent extends HudRenderComponent {
  public constructor(
    private readonly label: string,
    private readonly state: HudButtonVisualState,
  ) {
    super();
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) return;

    let fill = "rgba(46, 57, 69, 0.85)";
    if (this.state.hovered) {
      fill = "rgba(80, 97, 112, 0.9)";
    }
    if (this.state.pressed) {
      fill = "rgba(99, 121, 140, 0.95)";
    }

    ctx.fillStyle = fill;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.strokeStyle = "rgba(238, 228, 201, 0.75)";
    ctx.lineWidth = 2;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "#f6eee0";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, frame.x + frame.width / 2, frame.y + frame.height / 2);
  }
}
