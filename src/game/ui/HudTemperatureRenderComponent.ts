import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import type { TerminatorComponent } from "../components/TerminatorComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { getAmbientTemperature } from "./environment-temperature.ts";

export class HudTemperatureRenderComponent extends HudRenderComponent {
  public constructor(
    private readonly player: PlayerEntity,
    private readonly terminator: TerminatorComponent,
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

    const ambientCelsius = getAmbientTemperature(
      this.terminator,
      this.player.transform.transform.position,
    ).celsius;
    const fill = ambientCelsius >= 0 ? "rgba(255, 208, 162, 0.95)" : "rgba(188, 224, 255, 0.95)";

    ctx.fillStyle = fill;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = "600 26px Georgia";
    ctx.fillText(`${Math.round(ambientCelsius)}C`, frame.x + frame.width, frame.y);
  }
}
