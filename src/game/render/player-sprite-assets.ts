import { EcsRuntime, defineAssetManifest } from "@claudiu-ceia/tick";
import Attack1Sheet from "../../../assets/player/Attack1.png";
import CrouchIdleSheet from "../../../assets/player/CrouchIdle.png";
import CrouchRunSheet from "../../../assets/player/CrouchRun.png";
import IdleSheet from "../../../assets/player/Idle.png";
import RunBackwardsSheet from "../../../assets/player/RunBackwards.png";
import RunBackwardsAttackSheet from "../../../assets/player/RunBackwardsAttack.png";
import RunAttackSheet from "../../../assets/player/RunAttack.png";
import RunSheet from "../../../assets/player/Run.png";
import StrafeLeftSheet from "../../../assets/player/StrafeLeft.png";
import StrafeLeftAttackSheet from "../../../assets/player/StrafeLeftAttack.png";
import StrafeRightSheet from "../../../assets/player/StrafeRight.png";
import StrafeRightAttackSheet from "../../../assets/player/StrafeRightAttack.png";
import WalkSheet from "../../../assets/player/Walk.png";

export type PlayerSheets = {
  attack1: HTMLImageElement;
  crouchIdle: HTMLImageElement;
  crouchRun: HTMLImageElement;
  idle: HTMLImageElement;
  run: HTMLImageElement;
  runAttack: HTMLImageElement;
  runBackwards: HTMLImageElement;
  runBackwardsAttack: HTMLImageElement;
  strafeLeft: HTMLImageElement;
  strafeLeftAttack: HTMLImageElement;
  strafeRight: HTMLImageElement;
  strafeRightAttack: HTMLImageElement;
  walk: HTMLImageElement;
};

const PLAYER_SPRITE_MANIFEST = defineAssetManifest({
  images: {
    crouchIdle: CrouchIdleSheet,
    crouchRun: CrouchRunSheet,
    idle: IdleSheet,
    run: RunSheet,
    runAttack: RunAttackSheet,
    runBackwards: RunBackwardsSheet,
    runBackwardsAttack: RunBackwardsAttackSheet,
    strafeLeft: StrafeLeftSheet,
    strafeLeftAttack: StrafeLeftAttackSheet,
    strafeRight: StrafeRightSheet,
    strafeRightAttack: StrafeRightAttackSheet,
    walk: WalkSheet,
    attack1: Attack1Sheet,
  },
});

let playerSheetsPromise: Promise<PlayerSheets> | null = null;

export const getPlayerSheets = (
  runtime: EcsRuntime = EcsRuntime.getCurrent(),
): Promise<PlayerSheets> => {
  if (!playerSheetsPromise) {
    playerSheetsPromise = runtime.assets
      .load(PLAYER_SPRITE_MANIFEST, { scopeLabel: "player-sprites" })
      .then((assets) => assets.images);
  }

  return playerSheetsPromise;
};
