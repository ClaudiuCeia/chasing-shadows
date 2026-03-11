import { Vector2D } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { isoToWorld } from "../../shared/math/iso.ts";

export type PlayerAttackClipName =
  | "attack1"
  | "runAttack"
  | "runBackwardsAttack"
  | "strafeLeftAttack"
  | "strafeRightAttack";

export type PlayerAttackSelection = {
  clip: PlayerAttackClipName;
  playbackDirection: 1 | -1;
};

export type PlayerFireMode = "auto" | "semi";

export type PlayerMovementProfile = {
  forwardAmount: number;
  strafeAmount: number;
  normalizedSpeed: number;
  moving: boolean;
};

export const MOVE_THRESHOLD = 0.06;
export const FORWARD_ALIGNMENT_THRESHOLD = 0.966;
export const ATTACK_FPS = 14;
export const ATTACK_FRAME_COUNT = 14;
export const ATTACK_AUTO_LOOP_START_FRAME = 1;
export const ATTACK_SEMI_START_FRAME = 0;
export const ATTACK_SEMI_END_FRAME = 4;
export const ATTACK_SEMI_TIME_SCALE = 3;
export const ATTACK_REFIRE_SECONDS = ((ATTACK_SEMI_END_FRAME - ATTACK_SEMI_START_FRAME + 1) / ATTACK_FPS) * ATTACK_SEMI_TIME_SCALE;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const getPlayerMovementProfile = (
  intent: MovementIntentComponent,
  controller: TopDownControllerComponent,
  velocity: Vector2D,
  facingVector: Vector2D,
): PlayerMovementProfile => {
  const hasInput = intent.forward !== 0 || intent.strafe !== 0;
  const movementReference = hasInput
    ? isoToWorld(
        new Vector2D(intent.strafe, -intent.forward),
        { tileWidth: GAME_CONFIG.tileWidth, tileHeight: GAME_CONFIG.tileHeight },
      )
    : velocity;

  if (movementReference.magnitude <= 0.0001) {
    return {
      forwardAmount: 0,
      strafeAmount: 0,
      normalizedSpeed: 0,
      moving: false,
    };
  }

  const normalizedMovement = movementReference.normalize();
  const rightVector = new Vector2D(-facingVector.y, facingVector.x);
  const desiredSpeed = intent.crouch
    ? controller.config.maxSpeed * controller.config.crouchMultiplier
    : intent.walk
      ? controller.config.maxSpeed * controller.config.walkMultiplier
      : controller.config.maxSpeed;

  return {
    forwardAmount: normalizedMovement.dot(facingVector),
    strafeAmount: normalizedMovement.dot(rightVector),
    normalizedSpeed: clamp01((hasInput ? desiredSpeed : velocity.magnitude) / controller.config.maxSpeed),
    moving: hasInput || velocity.magnitude > MOVE_THRESHOLD,
  };
};

export const getDefaultAttackSelection = (profile: PlayerMovementProfile): PlayerAttackSelection => {
  if (!profile.moving) {
    return { clip: "attack1", playbackDirection: 1 };
  }

  if (Math.abs(profile.forwardAmount) >= FORWARD_ALIGNMENT_THRESHOLD) {
    return {
      clip: profile.forwardAmount < 0 ? "runBackwardsAttack" : "runAttack",
      playbackDirection: 1,
    };
  }

  return {
    clip: profile.strafeAmount >= 0 ? "strafeRightAttack" : "strafeLeftAttack",
    playbackDirection: profile.forwardAmount < 0 ? -1 : 1,
  };
};
