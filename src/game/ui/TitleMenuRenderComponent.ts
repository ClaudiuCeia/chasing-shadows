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

    const background = ctx.createLinearGradient(frame.x, frame.y, frame.x + frame.width, frame.y + frame.height);
    background.addColorStop(0, "#6a4027");
    background.addColorStop(0.5, "#241f2e");
    background.addColorStop(1, "#0a131d");
    ctx.fillStyle = background;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "rgba(255, 238, 209, 0.08)";
    for (let i = 0; i < 5; i++) {
      const y = frame.y + 140 + i * 120;
      ctx.fillRect(frame.x, y, frame.width, 2);
    }

    ctx.fillStyle = "#f3e5c8";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "600 68px Georgia";
    ctx.fillText("Chasing Shadow", frame.x + frame.width / 2, frame.y + 180);

    ctx.fillStyle = "rgba(243, 231, 210, 0.84)";
    ctx.font = "24px Georgia";
    ctx.fillText("Stay inside the moving twilight band.", frame.x + frame.width / 2, frame.y + 278);
    ctx.fillText("Sun burns. Darkness freezes.", frame.x + frame.width / 2, frame.y + 314);

    for (const button of getTitleOverlayButtons(frame)) {
      const hovered = this.state.hoveredAction === button.action;
      const pressed = this.state.pressedAction === button.action;
      let fill = button.action === "new" ? "rgba(120, 69, 53, 0.9)" : "rgba(75, 90, 112, 0.9)";
      if (hovered) {
        fill = button.action === "new" ? "rgba(156, 92, 70, 0.96)" : "rgba(103, 125, 154, 0.96)";
      }
      if (pressed) {
        fill = button.action === "new" ? "rgba(181, 107, 82, 0.98)" : "rgba(126, 149, 181, 0.98)";
      }

      ctx.fillStyle = fill;
      ctx.fillRect(button.x, button.y, button.width, button.height);

      ctx.strokeStyle = "rgba(247, 234, 208, 0.78)";
      ctx.lineWidth = 2;
      ctx.strokeRect(button.x, button.y, button.width, button.height);

      ctx.fillStyle = "#fbf4e6";
      ctx.textBaseline = "middle";
      ctx.font = "600 29px Georgia";
      ctx.fillText(
        button.action === "continue" ? "Continue" : "New",
        button.x + button.width / 2,
        button.y + button.height / 2,
      );
    }
  }
}
