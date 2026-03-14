import { Component } from "@claudiu-ceia/tick";
import {
  ATTACK_FRAME_COUNT,
  ATTACK_REFIRE_SECONDS,
  ATTACK_SEMI_FRAME_COUNT,
  type PlayerAttackClipName,
  type PlayerFireMode,
} from "../render/player-animation-logic.ts";

export const DRY_FIRE_FEEDBACK_SECONDS = 0.18;

export class PlayerAttackComponent extends Component {
  public active = false;
  public clip: PlayerAttackClipName = "attack1";
  public directionIndex = 0;
  public playbackDirection: 1 | -1 = 1;
  public fireMode: PlayerFireMode = "auto";
  public frameCursor = 0;
  public refireRemaining = 0;
  public refireSeconds = ATTACK_REFIRE_SECONDS;
  public looping = false;
  public releasedSinceLastShot = true;
  public releaseQueued = false;
  public dryFireFeedbackRemaining = 0;
  public dryFireFeedbackCount = 0;
  public shotCounter = 0;

  public getFrameIndex(): number {
    const frameCount = this.looping ? ATTACK_FRAME_COUNT : ATTACK_SEMI_FRAME_COUNT;
    const index = Math.min(frameCount - 1, Math.max(0, Math.floor(this.frameCursor)));
    return this.playbackDirection === 1 ? index : frameCount - 1 - index;
  }
}
