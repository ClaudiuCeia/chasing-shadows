import { EcsRuntime, PhysicsBodyComponent, TransformComponent, Vector2D } from "@claudiu-ceia/tick";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { IsometricRenderableComponent } from "../components/IsometricRenderableComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { worldToIso } from "../../shared/math/iso.ts";
import {
  FORWARD_ALIGNMENT_THRESHOLD,
  getPlayerMovementProfile,
  MOVE_THRESHOLD,
} from "./player-animation-logic.ts";
import { screenVectorToDirectionIndex } from "./player-sprite-math.ts";
import { getPlayerSheets, type PlayerSheets } from "./player-sprite-assets.ts";

type AnimationClipName =
  | "attack1"
  | "crouchIdle"
  | "crouchRun"
  | "idle"
  | "run"
  | "runAttack"
  | "runBackwards"
  | "runBackwardsAttack"
  | "strafeLeft"
  | "strafeLeftAttack"
  | "strafeRight"
  | "strafeRightAttack"
  | "walk";

type AnimationSelection = {
  clip: AnimationClipName;
  playbackDirection: 1 | -1;
  fps: number;
};

const FRAME_SIZE = 128;
const FRAME_COLS = 14;
const FRAME_ROWS = 8;
const FOOT_ANCHOR_Y = 88;
const SPRITE_SCALE = 3;
const GROUND_CLEARANCE_PX = 7;

const WALK_FPS_MIN = 9;
const WALK_FPS_MAX = 15;
const RUN_FPS_MIN = 14;
const RUN_FPS_MAX = 24;
const CROUCH_FPS_MIN = 8;
const CROUCH_FPS_MAX = 13;
const IDLE_FPS = 6;
const CROUCH_IDLE_FPS = 5;

export class PlayerRenderComponent extends IsometricRenderableComponent {
  private static sheetsPromise: Promise<PlayerSheets> | null = null;

  private sheets: PlayerSheets | null = null;
  private frameCursor = 0;
  private directionIndex = 0;
  private lastRenderTime = 0;

  public constructor() {
    super();
    this.sortOffset = 0.5;

    if (typeof Image === "undefined") {
      return;
    }

    if (!PlayerRenderComponent.sheetsPromise) {
      PlayerRenderComponent.sheetsPromise = getPlayerSheets(EcsRuntime.getCurrent());
    }

    PlayerRenderComponent.sheetsPromise!
      .then((sheets) => {
        this.sheets = sheets;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  public override renderIsometric(
    ctx: CanvasRenderingContext2D,
    screen: Vector2D,
    _isSelected: boolean,
  ): void {
    if (!this.sheets) {
      return;
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (this.lastRenderTime <= 0) {
      this.lastRenderTime = now;
    }
    const deltaTime = Math.min(0.1, Math.max(0, (now - this.lastRenderTime) / 1000));
    this.lastRenderTime = now;

    const velocity = this.ent.getComponent(PhysicsBodyComponent).getVelocity();
    const controller = this.ent.getComponent(TopDownControllerComponent);
    const transform = this.ent.getComponent(TransformComponent);
    const intent = this.ent.getComponent(MovementIntentComponent);
    const attack = this.ent.getComponent(PlayerAttackComponent);
    const speed = velocity.magnitude;
    const facingVector = new Vector2D(
      Math.cos(transform.transform.rotation),
      Math.sin(transform.transform.rotation),
    );
    const isoFacing = worldToIso(facingVector, {
      tileWidth: GAME_CONFIG.tileWidth,
      tileHeight: GAME_CONFIG.tileHeight,
    });
    if (isoFacing.magnitude > 0.001) {
      this.directionIndex = screenVectorToDirectionIndex(isoFacing);
    }

    let sheet: HTMLImageElement;
    let frameIndex: number;
    let nextFrameIndex: number | null = null;
    let frameBlendAlpha = 0;
    let directionIndex = this.directionIndex;

    if (attack.active) {
      sheet = this.sheets[attack.clip];
      const blend = attack.getFrameBlend();
      frameIndex = blend.currentFrame;
      nextFrameIndex = blend.nextFrame;
      frameBlendAlpha = blend.alpha;
      directionIndex = attack.directionIndex;
    } else {
      const animation = this.selectAnimation(intent, controller, velocity, speed, facingVector);
      this.frameCursor += deltaTime * animation.fps * animation.playbackDirection;
      while (this.frameCursor < 0) {
        this.frameCursor += FRAME_COLS;
      }
      this.frameCursor %= FRAME_COLS;

      sheet = this.sheets[animation.clip];
      frameIndex = Math.floor(this.frameCursor) % FRAME_COLS;
    }

    const frameX = frameIndex * FRAME_SIZE;
    const frameY = (directionIndex % FRAME_ROWS) * FRAME_SIZE;

    const drawWidth = Math.floor(FRAME_SIZE * SPRITE_SCALE);
    const drawHeight = Math.floor(FRAME_SIZE * SPRITE_SCALE);
    const drawX = Math.floor(screen.x - drawWidth / 2);
    const drawY = Math.floor(screen.y - FOOT_ANCHOR_Y * SPRITE_SCALE - GROUND_CLEARANCE_PX);

    ctx.drawImage(sheet, frameX, frameY, FRAME_SIZE, FRAME_SIZE, drawX, drawY, drawWidth, drawHeight);

    if (nextFrameIndex !== null && nextFrameIndex !== frameIndex && frameBlendAlpha > 0.001) {
      ctx.save();
      ctx.globalAlpha = frameBlendAlpha;
      ctx.drawImage(
        sheet,
        nextFrameIndex * FRAME_SIZE,
        frameY,
        FRAME_SIZE,
        FRAME_SIZE,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
      ctx.restore();
    }
  }

  private selectAnimation(
    intent: MovementIntentComponent,
    controller: TopDownControllerComponent,
    velocity: Vector2D,
    speed: number,
    facingVector: Vector2D,
  ): AnimationSelection {
    const crouched = intent.crouch;
    const profile = getPlayerMovementProfile(intent, controller, velocity, facingVector);
    if (!profile.moving && speed <= MOVE_THRESHOLD) {
      return {
        clip: crouched ? "crouchIdle" : "idle",
        playbackDirection: 1,
        fps: crouched ? CROUCH_IDLE_FPS : IDLE_FPS,
      };
    }

    if (!profile.moving) {
      return {
        clip: crouched ? "crouchIdle" : "idle",
        playbackDirection: 1,
        fps: crouched ? CROUCH_IDLE_FPS : IDLE_FPS,
      };
    }

    if (crouched) {
      return {
        clip: "crouchRun",
        playbackDirection: profile.forwardAmount < 0 ? -1 : 1,
        fps: CROUCH_FPS_MIN + (CROUCH_FPS_MAX - CROUCH_FPS_MIN) * profile.normalizedSpeed,
      };
    }

    if (Math.abs(profile.forwardAmount) < FORWARD_ALIGNMENT_THRESHOLD) {
      return {
        clip: profile.strafeAmount >= 0 ? "strafeRight" : "strafeLeft",
        playbackDirection: profile.forwardAmount < 0 ? -1 : 1,
        fps: RUN_FPS_MIN + (RUN_FPS_MAX - RUN_FPS_MIN) * profile.normalizedSpeed,
      };
    }

    if (intent.walk) {
      return {
        clip: "walk",
        playbackDirection: profile.forwardAmount < 0 ? -1 : 1,
        fps: WALK_FPS_MIN + (WALK_FPS_MAX - WALK_FPS_MIN) * profile.normalizedSpeed,
      };
    }

    return {
      clip: profile.forwardAmount < 0 ? "runBackwards" : "run",
      playbackDirection: 1,
      fps: RUN_FPS_MIN + (RUN_FPS_MAX - RUN_FPS_MIN) * profile.normalizedSpeed,
    };
  }
}
