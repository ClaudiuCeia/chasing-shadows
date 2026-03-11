import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";

export type FpsSnapshot = {
  fps: number;
  frameTimeMs: number;
};

export class FpsCounterRenderComponent extends HudRenderComponent {
  public constructor(private readonly getSnapshot: () => FpsSnapshot) {
    super();
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) return;

    const snapshot = this.getSnapshot();
    const border = snapshot.fps >= 55 ? "#44ff44" : snapshot.fps >= 30 ? "#ffcc00" : "#ff4444";

    ctx.fillStyle = "rgba(10, 12, 16, 0.82)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1);

    ctx.fillStyle = "#e2ebf2";
    ctx.font = "600 12px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${snapshot.fps} FPS`, frame.x + 6, frame.y + 6);

    ctx.fillStyle = "#8a9ba8";
    ctx.fillText(`${snapshot.frameTimeMs.toFixed(1)} ms`, frame.x + 6, frame.y + 20);
  }
}
