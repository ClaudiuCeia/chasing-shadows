import { HudLayoutNodeComponent, HudRenderComponent, Vector2D, type ICamera } from "@claudiu-ceia/tick";
import { DebugOverlayComponent } from "../components/DebugOverlayComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { VisibilityStateComponent } from "../components/VisibilityStateComponent.ts";
import { HudButtonEntity } from "./HudButtonEntity.ts";

const DEBUG_TEXT_PADDING_X = 10;
const DEBUG_TEXT_PADDING_Y = 8;
const DEBUG_TEXT_LINE_HEIGHT = 18;
const DEBUG_BOX_MIN_WIDTH = 190;
const DEBUG_BOX_MIN_HEIGHT = 72;
const DEBUG_BOX_MAX_WIDTH = 340;

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  if (ctx.measureText(text).width <= maxWidth) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    let remaining = word;
    while (remaining.length > 0) {
      let splitIndex = remaining.length;
      while (splitIndex > 1 && ctx.measureText(remaining.slice(0, splitIndex)).width > maxWidth) {
        splitIndex -= 1;
      }
      lines.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex);
    }
    currentLine = "";
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
};

export class HudDebugRenderComponent extends HudRenderComponent {
  public constructor(
    private readonly debug: DebugOverlayComponent,
    private readonly player: PlayerEntity,
    private readonly toggleButtons: readonly HudButtonEntity[],
  ) {
    super();
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    if (!this.debug.enabled) {
      this.setToggleButtonsVisible(false);
      return;
    }

    this.setToggleButtonsVisible(true);

    const layout = this.ent.getComponent(HudLayoutNodeComponent);

    const position = this.player.transform.transform.position;
    const primaryRay = this.player.rayEmitter.getPrimaryRay();
    const primaryWeaponRay = this.player.weaponRaycast.rays[Math.floor(this.player.weaponRaycast.rays.length / 2)] ?? null;
    const posture = this.player.getComponent(MovementIntentComponent).crouch ? "crouched" : "standing";
    const playerElevation = this.player.tilePosition.z;
    const headElevation = playerElevation + this.player.hitCollider.bodyHeight;
    const visibility = this.player.runtime.registry
      .getAllEntities()
      .find((entity) => entity.hasComponent(VisibilityStateComponent))
      ?.getComponent(VisibilityStateComponent);
    const lines = [
      `Posture: ${posture}`,
      `Player x: ${position.x.toFixed(2)}`,
      `Player y: ${position.y.toFixed(2)}`,
      `Player z: ${playerElevation.toFixed(2)}`,
      `Head z: ${headElevation.toFixed(2)}`,
      `Rays: ${this.player.rayEmitter.rayCount}`,
      `LOS render: ${this.debug.renderLosRays ? "on" : "off"}`,
      `Weapon rays: ${this.player.weaponRaycast.rayCount}`,
      `Weapon mode: ${this.player.weaponRaycast.mode ?? "idle"}`,
      `Combat render: ${this.debug.renderCombatRays ? "on" : "off"}`,
      `Visible tiles: ${visibility?.getVisibleTiles().length ?? 0}`,
      `Remembered tiles: ${visibility?.getRememberedTiles().length ?? 0}`,
      `Remembered structures: ${visibility?.getRememberedStructureKeys().length ?? 0}`,
      `Visible static: ${visibility?.getVisibleStaticObjectIds().length ?? 0}`,
      primaryRay?.hit
        ? `Hit: ${primaryRay.hit.entity?.constructor.name.replace(/Entity$/, "") ?? primaryRay.hit.type} @ ${primaryRay.hit.distance.toFixed(2)}`
        : `Range: ${primaryRay?.distance.toFixed(2) ?? "-"}`,
      primaryWeaponRay?.hit
        ? `Weapon hit: ${primaryWeaponRay.hit.entity?.constructor.name.replace(/Entity$/, "") ?? primaryWeaponRay.hit.type} @ ${primaryWeaponRay.hit.distance.toFixed(2)}`
        : `Weapon range: ${primaryWeaponRay?.distance.toFixed(2) ?? "-"}`,
    ];

    ctx.save();
    ctx.font = "600 14px Georgia";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const preferredWidth = Math.min(
      DEBUG_BOX_MAX_WIDTH,
      Math.max(
        DEBUG_BOX_MIN_WIDTH,
        Math.ceil(Math.max(...lines.map((line) => ctx.measureText(line).width), 0)) + DEBUG_TEXT_PADDING_X * 2,
      ),
    );
    const wrappedLines = lines.flatMap((line) => wrapText(ctx, line, preferredWidth - DEBUG_TEXT_PADDING_X * 2));
    const toggleAreaHeight = this.toggleButtons.length > 0 ? 76 : 0;
    const preferredHeight = Math.max(
      DEBUG_BOX_MIN_HEIGHT,
      DEBUG_TEXT_PADDING_Y * 2 + wrappedLines.length * DEBUG_TEXT_LINE_HEIGHT + toggleAreaHeight,
    );

    layout.setSize(preferredWidth, preferredHeight);
    const frame = layout.getFrame();
    if (!frame) {
      ctx.restore();
      return;
    }

    ctx.fillStyle = "rgba(12, 14, 18, 0.74)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
    ctx.strokeStyle = "rgba(224, 215, 194, 0.24)";
    ctx.lineWidth = 1;
    ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

    ctx.fillStyle = "rgba(242, 232, 214, 0.94)";

    ctx.beginPath();
    ctx.rect(frame.x, frame.y, frame.width, frame.height);
    ctx.clip();
    wrappedLines.forEach((line, index) => {
      ctx.fillText(line, frame.x + DEBUG_TEXT_PADDING_X, frame.y + DEBUG_TEXT_PADDING_Y + index * DEBUG_TEXT_LINE_HEIGHT);
    });
    ctx.restore();
  }

  private setToggleButtonsVisible(visible: boolean): void {
    for (const button of this.toggleButtons) {
      button.layout.setVisible(visible);
      button.layout.setInteractive(visible);
    }
  }
}
