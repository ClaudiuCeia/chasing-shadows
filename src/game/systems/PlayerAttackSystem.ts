import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { getItemFireMode } from "../items/item-catalog.ts";
import {
  ATTACK_FPS,
  ATTACK_FRAME_COUNT,
  ATTACK_REFIRE_SECONDS,
  ATTACK_SEMI_FRAME_COUNT,
  type PlayerAttackClipName,
} from "../render/player-animation-logic.ts";

export class PlayerAttackSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private attackQuery: EntityQuery | null = null;
  private inventoryQuery: EntityQuery | null = null;

  public constructor(runtime: EcsRuntime = EcsRuntime.getCurrent()) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.attackQuery = this.runtime.registry.query().with(PlayerAttackComponent);
    this.inventoryQuery = this.runtime.registry.query().with(InventoryComponent);
  }

  public update(deltaTime: number): void {
    const attack = this.attackQuery ? getSingletonComponent(this.attackQuery, PlayerAttackComponent) : null;
    const inventory = this.inventoryQuery ? getSingletonComponent(this.inventoryQuery, InventoryComponent) : null;
    if (attack) {
      if (inventory) {
        PlayerAttackSystem.syncFireModeFromInventory(attack, inventory);
      }
      PlayerAttackSystem.tick(attack, deltaTime);
    }
  }

  public static syncFireModeFromInventory(attack: PlayerAttackComponent, inventory: InventoryComponent): void {
    const activeWeapon = inventory.getEquippedWeaponForActiveSlot();
    const nextFireMode = activeWeapon ? getItemFireMode(activeWeapon.itemId) : "semi";
    if (attack.fireMode === nextFireMode) {
      return;
    }

    attack.fireMode = nextFireMode;
    if (attack.active) {
      PlayerAttackSystem.stopAttack(attack);
      attack.refireRemaining = 0;
    }
    attack.releasedSinceLastShot = true;
  }

  public static tick(attack: PlayerAttackComponent, deltaTime: number): void {
    attack.refireRemaining = Math.max(0, attack.refireRemaining - Math.max(0, deltaTime));

    if (!attack.active) {
      return;
    }

    attack.frameCursor += Math.max(0, deltaTime) * ATTACK_FPS;
    if (attack.looping) {
      if (attack.frameCursor >= ATTACK_FRAME_COUNT) {
        attack.frameCursor %= ATTACK_FRAME_COUNT;
      }
      return;
    }

    if (attack.frameCursor >= ATTACK_SEMI_FRAME_COUNT) {
      attack.active = false;
      attack.frameCursor = ATTACK_SEMI_FRAME_COUNT - 1;
      if (attack.releaseQueued) {
        attack.releasedSinceLastShot = true;
        attack.releaseQueued = false;
      }
    }
  }

  public static startAttack(
    attack: PlayerAttackComponent,
    clip: PlayerAttackClipName,
    directionIndex: number,
    playbackDirection: 1 | -1,
  ): void {
    attack.active = true;
    attack.clip = clip;
    attack.directionIndex = directionIndex;
    attack.playbackDirection = playbackDirection;
    attack.frameCursor = 0;
    attack.looping = attack.fireMode === "auto";
    attack.refireRemaining = ATTACK_REFIRE_SECONDS;
    attack.releasedSinceLastShot = false;
    attack.releaseQueued = false;
  }

  public static stopAttack(attack: PlayerAttackComponent): void {
    attack.active = false;
    attack.frameCursor = 0;
    attack.looping = false;
    attack.releaseQueued = false;
  }

  public static toggleFireMode(attack: PlayerAttackComponent): void {
    attack.fireMode = attack.fireMode === "auto" ? "semi" : "auto";
    PlayerAttackSystem.stopAttack(attack);
    attack.refireRemaining = 0;
    attack.releasedSinceLastShot = true;
  }

  public static handleTrigger(
    attack: PlayerAttackComponent,
    clip: PlayerAttackClipName | null,
    directionIndex: number | null,
    playbackDirection: 1 | -1 | null,
    phase: "press" | "hold" | "release",
  ): boolean {
    if (phase === "release") {
      if (attack.fireMode === "auto") {
        attack.releasedSinceLastShot = true;
        PlayerAttackSystem.stopAttack(attack);
      } else if (attack.active) {
        attack.releaseQueued = true;
      } else {
        attack.releasedSinceLastShot = true;
        attack.releaseQueued = false;
      }
      return false;
    }

    if (!clip || directionIndex === null || playbackDirection === null) {
      return false;
    }

    if (attack.fireMode === "semi") {
      if (phase !== "press" || !attack.releasedSinceLastShot || attack.refireRemaining > 0) {
        return attack.active;
      }

      PlayerAttackSystem.startAttack(attack, clip, directionIndex, playbackDirection);
      return true;
    }

    const stateChanged =
      !attack.active ||
      attack.clip !== clip ||
      attack.directionIndex !== directionIndex ||
      attack.playbackDirection !== playbackDirection;
    if (stateChanged) {
      PlayerAttackSystem.startAttack(attack, clip, directionIndex, playbackDirection);
    }

    return true;
  }
}
