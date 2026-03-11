import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import { TitleMenuState } from "./TitleMenuState.ts";
import { getTitleOverlayButtons } from "./title-overlay-layout.ts";

export class TitleMenuRenderComponent extends HudRenderComponent {
  public constructor(private readonly state: TitleMenuState) {
    super();
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "600 42px Georgia";
    ctx.fillText("Chasing Shadow", frame.x + frame.width / 2, frame.y + 220);

    for (const button of getTitleOverlayButtons(frame)) {
      const hovered = this.state.hoveredAction === button.action;
      const pressed = this.state.pressedAction === button.action;
      let fill = "#000000";
      if (hovered) {
        fill = "#111111";
      }
      if (pressed) {
        fill = "#1a1a1a";
      }

      ctx.fillStyle = fill;
      ctx.fillRect(button.x, button.y, button.width, button.height);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(button.x, button.y, button.width, button.height);

      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.font = "600 18px Georgia";
      ctx.fillText(
        button.action === "continue" ? "Continue" : "New",
        button.x + button.width / 2,
        button.y + button.height / 2,
      );
    }
  }
}
