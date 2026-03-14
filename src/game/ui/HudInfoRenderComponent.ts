import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { getAmbientTemperature } from "./environment-temperature.ts";
import type { TerminatorComponent } from "../components/TerminatorComponent.ts";
import { clamp01 } from "../../shared/math/clamp.ts";
const AMBIENT_MIN_C = -150;
const AMBIENT_MAX_C = 400;

const drawMeter = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  labelWidth: number,
  width: number,
  label: string,
  value: number,
  fill: string,
): void => {
  const clamped = clamp01(value / 100);
  const barX = x + labelWidth;
  const barWidth = width - labelWidth;

  ctx.fillStyle = "rgba(241, 230, 208, 0.88)";
  ctx.font = "600 14px Georgia";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 7);

  ctx.fillStyle = "rgba(19, 23, 28, 0.86)";
  ctx.fillRect(barX, y, barWidth, 14);

  ctx.fillStyle = fill;
  ctx.fillRect(barX + 1, y + 1, Math.max(0, (barWidth - 2) * clamped), 12);

  ctx.strokeStyle = "rgba(239, 223, 194, 0.34)";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, y, barWidth, 14);
};

const drawAmbientMeter = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  labelWidth: number,
  width: number,
  ambientCelsius: number,
): void => {
  const barX = x + labelWidth;
  const barWidth = width - labelWidth;
  const indicatorX =
    barX +
    clamp01((ambientCelsius - AMBIENT_MIN_C) / (AMBIENT_MAX_C - AMBIENT_MIN_C)) * (barWidth - 1);
  const gradient = ctx.createLinearGradient(barX, y, barX + barWidth, y);

  ctx.fillStyle = "rgba(241, 230, 208, 0.88)";
  ctx.font = "600 14px Georgia";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Ambient", x, y + 7);

  gradient.addColorStop(0, "rgba(90, 146, 214, 0.95)");
  gradient.addColorStop(0.5, "rgba(212, 204, 182, 0.9)");
  gradient.addColorStop(1, "rgba(217, 112, 70, 0.96)");
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, y, barWidth, 14);

  ctx.strokeStyle = "rgba(239, 223, 194, 0.34)";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, y, barWidth, 14);

  ctx.strokeStyle = "rgba(255, 248, 234, 0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(indicatorX, y - 2);
  ctx.lineTo(indicatorX, y + 16);
  ctx.stroke();
};

export class HudInfoRenderComponent extends HudRenderComponent {
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

    const info = {
      hp: this.player.health.hp,
      hunger: this.player.needs.hunger,
      thirst: this.player.needs.thirst,
      ambientCelsius: getAmbientTemperature(
        this.terminator,
        this.player.transform.transform.position,
      ).celsius,
    };
    const labelWidth = 68;

    const meterX = frame.x;
    const meterWidth = frame.width;
    drawMeter(
      ctx,
      meterX,
      frame.y,
      labelWidth,
      meterWidth,
      "Health",
      info.hp,
      "rgba(190, 74, 70, 0.96)",
    );
    drawMeter(
      ctx,
      meterX,
      frame.y + 20,
      labelWidth,
      meterWidth,
      "Hunger",
      info.hunger,
      "rgba(201, 155, 78, 0.96)",
    );
    drawMeter(
      ctx,
      meterX,
      frame.y + 40,
      labelWidth,
      meterWidth,
      "Thirst",
      info.thirst,
      "rgba(73, 152, 201, 0.96)",
    );
    drawAmbientMeter(ctx, meterX, frame.y + 60, labelWidth, meterWidth, info.ambientCelsius);
  }
}
