import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";

export type HudTemperatureSnapshot = {
  ambientCelsius: number;
};

export class HudTemperatureRenderComponent extends HudRenderComponent {
  public constructor(private readonly getSnapshot: () => HudTemperatureSnapshot) {
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
    const fill = snapshot.ambientCelsius >= 0 ? "rgba(255, 208, 162, 0.95)" : "rgba(188, 224, 255, 0.95)";

    ctx.fillStyle = fill;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = "600 26px Georgia";
    ctx.fillText(`${Math.round(snapshot.ambientCelsius)}C`, frame.x + frame.width, frame.y);
  }
}
