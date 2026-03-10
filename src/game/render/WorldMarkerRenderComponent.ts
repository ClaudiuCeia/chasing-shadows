import { RenderComponent, RenderLayer, Vector2D, type ICamera } from "@claudiu-ceia/tick";
import { MarkerState } from "../state/MarkerState.ts";

export class WorldMarkerRenderComponent extends RenderComponent {
  public constructor(private readonly marker: MarkerState) {
    super(RenderLayer.Foreground);
  }

  public override isVisible(_camera: ICamera): boolean {
    return true;
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    if (!this.marker.point) return;

    const point = camera.toCanvas(this.marker.point, canvasSize);
    ctx.strokeStyle = "#f7d36b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y - 2, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}
