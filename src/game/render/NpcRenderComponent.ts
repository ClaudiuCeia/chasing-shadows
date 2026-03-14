import { EcsRuntime, PhysicsBodyComponent, TransformComponent, Vector2D } from "@claudiu-ceia/tick";
import { IsometricRenderableComponent } from "../components/IsometricRenderableComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { worldToIso } from "../../shared/math/iso.ts";
import { screenVectorToDirectionIndex } from "./player-sprite-math.ts";
import { getNpcSheets, type NpcSheets } from "./npc-sprite-assets.ts";

const FRAME_SIZE = 128;
const FRAME_COLS = 14;
const FRAME_ROWS = 8;
const FOOT_ANCHOR_Y = 88;
const SPRITE_SCALE = 3;
const GROUND_CLEARANCE_PX = 7;
const MOVE_THRESHOLD = 0.06;
const IDLE_FPS = 6;
const WALK_FPS_MIN = 9;
const WALK_FPS_MAX = 15;

type AnimationClipName = "idle" | "walk";

const getSpriteBounds = (screen: Vector2D): { x: number; y: number; width: number; height: number } => {
  const width = Math.floor(FRAME_SIZE * SPRITE_SCALE);
  const height = Math.floor(FRAME_SIZE * SPRITE_SCALE);
  return {
    x: Math.floor(screen.x - width / 2),
    y: Math.floor(screen.y - FOOT_ANCHOR_Y * SPRITE_SCALE - GROUND_CLEARANCE_PX),
    width,
    height,
  };
};

export class NpcRenderComponent extends IsometricRenderableComponent {
  private static sheetsPromise: Promise<NpcSheets> | null = null;

  private sheets: NpcSheets | null = null;
  private frameCursor = 0;
  private directionIndex = 0;
  private currentClip: AnimationClipName = "idle";
  private currentFrameIndex = 0;

  public constructor() {
    super();
    this.sortOffset = 0.5;

    if (typeof Image === "undefined") {
      return;
    }

    if (!NpcRenderComponent.sheetsPromise) {
      NpcRenderComponent.sheetsPromise = getNpcSheets(EcsRuntime.getCurrent());
    }

    NpcRenderComponent.sheetsPromise!
      .then((sheets) => {
        this.sheets = sheets;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  public override update(dt: number): void {
    super.update(dt);

    const deltaTime = Math.min(0.1, Math.max(0, dt));
    const velocity = this.ent.getComponent(PhysicsBodyComponent).getVelocity();
    const transform = this.ent.getComponent(TransformComponent).transform;
    const speed = velocity.magnitude;
    const facingVector = new Vector2D(
      Math.cos(transform.rotation),
      Math.sin(transform.rotation),
    );
    const isoFacing = worldToIso(facingVector, {
      tileWidth: GAME_CONFIG.tileWidth,
      tileHeight: GAME_CONFIG.tileHeight,
    });
    if (isoFacing.magnitude > 0.001) {
      this.directionIndex = screenVectorToDirectionIndex(isoFacing);
    }

    this.currentClip = speed > MOVE_THRESHOLD ? "walk" : "idle";
    const fps = this.currentClip === "walk"
      ? WALK_FPS_MIN + (WALK_FPS_MAX - WALK_FPS_MIN) * Math.min(1, speed / GAME_CONFIG.playerBaseSpeed)
      : IDLE_FPS;
    this.frameCursor += deltaTime * fps;
    this.frameCursor %= FRAME_COLS;
    this.currentFrameIndex = Math.floor(this.frameCursor) % FRAME_COLS;
  }

  public override renderIsometric(
    ctx: CanvasRenderingContext2D,
    screen: Vector2D,
    _isSelected: boolean,
  ): void {
    if (!this.sheets) {
      return;
    }
    const frameX = this.currentFrameIndex * FRAME_SIZE;
    const frameY = (this.directionIndex % FRAME_ROWS) * FRAME_SIZE;
    const bounds = getSpriteBounds(screen);
    ctx.drawImage(this.sheets[this.currentClip], frameX, frameY, FRAME_SIZE, FRAME_SIZE, bounds.x, bounds.y, bounds.width, bounds.height);
  }
}
