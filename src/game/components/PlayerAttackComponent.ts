import { Component } from "@claudiu-ceia/tick";
import {
  ATTACK_AUTO_LOOP_START_FRAME,
  ATTACK_FPS,
  ATTACK_FRAME_COUNT,
  ATTACK_REFIRE_SECONDS,
  ATTACK_SEMI_END_FRAME,
  ATTACK_SEMI_START_FRAME,
  ATTACK_SEMI_TIME_SCALE,
  type PlayerAttackClipName,
  type PlayerFireMode,
} from "../render/player-animation-logic.ts";

export type PlayerAttackFrameBlend = {
  currentFrame: number;
  nextFrame: number;
  alpha: number;
};

export class PlayerAttackComponent extends Component {
  public static type = "player-attack";

  public active = false;
  public clip: PlayerAttackClipName = "attack1";
  public directionIndex = 0;
  public playbackDirection: 1 | -1 = 1;
  public fireMode: PlayerFireMode = "auto";
  public frameCursor = 0;
  public refireRemaining = 0;

  private looping = false;
  private releasedSinceLastShot = true;

  public toggleFireMode(): void {
    this.fireMode = this.fireMode === "auto" ? "semi" : "auto";
    this.stop();
    this.refireRemaining = 0;
    this.releasedSinceLastShot = true;
  }

  public start(clip: PlayerAttackClipName, directionIndex: number, playbackDirection: 1 | -1): void {
    this.active = true;
    this.clip = clip;
    this.directionIndex = directionIndex;
    this.playbackDirection = playbackDirection;
    this.frameCursor = 0;
    this.looping = this.fireMode === "auto";
    this.refireRemaining = ATTACK_REFIRE_SECONDS;
    this.releasedSinceLastShot = false;
  }

  public stop(): void {
    this.active = false;
    this.frameCursor = 0;
    this.looping = false;
  }

  public handleTrigger(
    clip: PlayerAttackClipName | null,
    directionIndex: number | null,
    playbackDirection: 1 | -1 | null,
    phase: "press" | "hold" | "release",
  ): boolean {
    if (phase === "release") {
      this.releasedSinceLastShot = true;
      if (this.fireMode === "auto") {
        this.stop();
      }
      return false;
    }

    if (!clip || directionIndex === null || playbackDirection === null) {
      return false;
    }

    if (this.fireMode === "semi") {
      if (phase !== "press" || !this.releasedSinceLastShot || this.refireRemaining > 0) {
        return this.active;
      }

      this.start(clip, directionIndex, playbackDirection);
      this.looping = false;
      return true;
    }

    const stateChanged =
      !this.active ||
      this.clip !== clip ||
      this.directionIndex !== directionIndex ||
      this.playbackDirection !== playbackDirection;
    if (stateChanged) {
      this.start(clip, directionIndex, playbackDirection);
    }

    return true;
  }

  public override update(deltaTime: number): void {
    this.refireRemaining = Math.max(0, this.refireRemaining - Math.max(0, deltaTime));

    if (!this.active) {
      return;
    }

    const playbackScale = this.looping ? 1 : 1 / ATTACK_SEMI_TIME_SCALE;
    this.frameCursor += Math.max(0, deltaTime) * ATTACK_FPS * playbackScale;
    if (this.looping) {
      if (this.frameCursor >= ATTACK_FRAME_COUNT) {
        const loopLength = ATTACK_FRAME_COUNT - ATTACK_AUTO_LOOP_START_FRAME;
        this.frameCursor =
          ATTACK_AUTO_LOOP_START_FRAME + (this.frameCursor - ATTACK_AUTO_LOOP_START_FRAME) % loopLength;
      }
      return;
    }

    const semiLength = ATTACK_SEMI_END_FRAME - ATTACK_SEMI_START_FRAME + 1;
    if (this.frameCursor >= semiLength) {
      this.active = false;
      this.frameCursor = semiLength - 1;
    }
  }

  public getFrameIndex(): number {
    return this.getFrameBlend().currentFrame;
  }

  public getFrameBlend(): PlayerAttackFrameBlend {
    if (this.looping) {
      const loopLength = ATTACK_FRAME_COUNT - ATTACK_AUTO_LOOP_START_FRAME;
      const loopCursor = this.frameCursor % loopLength;
      const baseFrame = ATTACK_AUTO_LOOP_START_FRAME + Math.floor(loopCursor);
      const nextBaseFrame = ATTACK_AUTO_LOOP_START_FRAME + ((Math.floor(loopCursor) + 1) % loopLength);
      const alpha = loopCursor - Math.floor(loopCursor);
      return {
        currentFrame: this.playbackDirection === 1 ? baseFrame : ATTACK_FRAME_COUNT - baseFrame,
        nextFrame: this.playbackDirection === 1 ? nextBaseFrame : ATTACK_FRAME_COUNT - nextBaseFrame,
        alpha,
      };
    }

    const semiLength = ATTACK_SEMI_END_FRAME - ATTACK_SEMI_START_FRAME + 1;
    const semiOffset = Math.min(semiLength - 1, Math.floor(this.frameCursor));
    const logicalFrame = ATTACK_SEMI_START_FRAME + semiOffset;
    const nextLogicalFrame = Math.min(ATTACK_SEMI_END_FRAME, logicalFrame + 1);
    const alpha = Math.min(0.9999, Math.max(0, this.frameCursor - Math.floor(this.frameCursor)));
    return {
      currentFrame: this.playbackDirection === 1 ? logicalFrame : ATTACK_SEMI_END_FRAME - semiOffset,
      nextFrame:
        this.playbackDirection === 1
          ? nextLogicalFrame
          : Math.max(ATTACK_SEMI_START_FRAME, ATTACK_SEMI_END_FRAME - semiOffset - 1),
      alpha,
    };
  }
}
