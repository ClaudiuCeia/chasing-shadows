import {
  HudLayoutNodeComponent,
  HudRenderComponent,
  Vector2D,
  type ICamera,
} from "@claudiu-ceia/tick";

export type HudInfoSnapshot = {
  seed: number;
  elapsedSeconds: number;
  hunger: number;
  thirst: number;
  heat: number;
  cold: number;
  hp: number;
};

export class HudInfoRenderComponent extends HudRenderComponent {
  public constructor(private readonly getInfo: () => HudInfoSnapshot) {
    super();
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const frame = this.ent.getComponent(HudLayoutNodeComponent).getFrame();
    if (!frame) return;

    const info = this.getInfo();
    const lines = [
      `Seed: ${info.seed}`,
      `Time: ${info.elapsedSeconds.toFixed(1)}s`,
      `HP: ${info.hp.toFixed(0)}`,
      `Hunger: ${info.hunger.toFixed(0)}`,
      `Thirst: ${info.thirst.toFixed(0)}`,
      `Heat/Cold: ${info.heat.toFixed(0)} / ${info.cold.toFixed(0)}`,
    ];

    ctx.fillStyle = "rgba(12, 14, 19, 0.68)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

    ctx.strokeStyle = "rgba(223, 205, 175, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "#efe8d7";
    ctx.font = "22px monospace";
    ctx.textBaseline = "top";

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i] ?? "", frame.x + 16, frame.y + 14 + i * 30);
    }
  }
}
