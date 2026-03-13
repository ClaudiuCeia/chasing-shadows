import {
  EcsRuntime,
  PhysicsBodyComponent,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { ModalStateComponent } from "../components/ModalStateComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { PlayerTagComponent } from "../components/PlayerTagComponent.ts";
import { PointerWorldComponent } from "../components/PointerWorldComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { getSingletonComponent, getSingletonEntity } from "../ecs/singleton.ts";
import { getDefaultAttackSelection, getPlayerMovementProfile } from "../render/player-animation-logic.ts";
import { PlayerAttackSystem } from "./PlayerAttackSystem.ts";
import { screenVectorToDirectionIndex } from "../render/player-sprite-math.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { worldToIso } from "../../shared/math/iso.ts";

export class WorldPointerActionSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private playerQuery: EntityQuery | null = null;
  private uiQuery: EntityQuery | null = null;
  private worldQuery: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly interactRange: number,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.playerQuery = this.runtime.registry
      .query()
      .with(PlayerTagComponent)
      .with(MovementIntentComponent)
      .with(TopDownControllerComponent)
      .with(PhysicsBodyComponent)
      .with(TransformComponent)
      .with(PlayerAttackComponent);
    this.uiQuery = this.runtime.registry.query().with(LootUiComponent).with(PointerWorldComponent).with(ModalStateComponent);
    this.worldQuery = this.runtime.registry.query().with(LootFieldComponent);
  }

  public update(): void {
    const pointer = this.uiQuery ? getSingletonComponent(this.uiQuery, PointerWorldComponent) : null;
    const lootUi = this.uiQuery ? getSingletonComponent(this.uiQuery, LootUiComponent) : null;
    const modalState = this.uiQuery ? getSingletonComponent(this.uiQuery, ModalStateComponent) : null;
    const lootField = this.worldQuery ? getSingletonComponent(this.worldQuery, LootFieldComponent) : null;
    const player = this.playerQuery ? getSingletonEntity<PlayerEntity>(this.playerQuery) : null;
    if (!pointer || !lootUi || !modalState || !lootField || !player) {
      return;
    }

    const attack = player.getComponent(PlayerAttackComponent);

    if (pointer.phase === null) {
      return;
    }

    if (pointer.phase === "release") {
      if (modalState.isOpen()) {
        pointer.mode = null;
        pointer.blockedByHud = false;
        pointer.phase = null;
        return;
      }
      if (pointer.mode === "attack" || (attack.fireMode === "semi" && !attack.releasedSinceLastShot)) {
        PlayerAttackSystem.handleTrigger(attack, null, null, null, "release");
      }
      pointer.mode = null;
      pointer.blockedByHud = false;
      pointer.phase = null;
      return;
    }

    if (pointer.phase === "click") {
      if (modalState.isOpen()) {
        pointer.mode = null;
        pointer.phase = null;
        return;
      }

      const lootTarget = this.getLootInteractionCandidate(player, lootField, pointer);
      if (lootTarget) {
        lootUi.openTileBox(lootTarget.x, lootTarget.y);
        modalState.open("loot");
        pointer.mode = null;
        pointer.phase = null;
        return;
      }

      pointer.mode = null;
      pointer.phase = null;
      return;
    }

    if (pointer.blockedByHud || !pointer.worldPoint) {
      pointer.phase = null;
      return;
    }

    if (modalState.isOpen()) {
      pointer.mode = null;
      pointer.phase = null;
      return;
    }

    if (pointer.phase === "press") {
      if (this.getLootInteractionCandidate(player, lootField, pointer)) {
        pointer.mode = "interaction";
        pointer.phase = null;
        return;
      }
    }

    if (pointer.mode === "interaction") {
      pointer.phase = null;
      return;
    }

    const transform = player.getComponent(TransformComponent).transform;
    const facingVector = new Vector2D(Math.cos(transform.rotation), Math.sin(transform.rotation));
    const profile = getPlayerMovementProfile(
      player.getComponent(MovementIntentComponent),
      player.getComponent(TopDownControllerComponent),
      player.getComponent(PhysicsBodyComponent).getVelocity(),
      facingVector,
    );
    const facingIso = worldToIso(facingVector, {
      tileWidth: GAME_CONFIG.tileWidth,
      tileHeight: GAME_CONFIG.tileHeight,
    });
    const attackSelection = getDefaultAttackSelection(profile);
    const directionIndex = screenVectorToDirectionIndex(facingIso);

    pointer.mode = PlayerAttackSystem.handleTrigger(
      attack,
      attackSelection.clip,
      directionIndex,
      attackSelection.playbackDirection,
      pointer.phase,
    )
      ? "attack"
      : null;
    pointer.phase = null;
  }

  private getLootInteractionCandidate(
    player: PlayerEntity,
    lootField: LootFieldComponent,
    pointer: PointerWorldComponent,
  ): { x: number; y: number } | null {
    if (!pointer.worldPoint) {
      return null;
    }

    const playerPosition = player.getComponent(TransformComponent).transform.position;
    const tileX = Math.round(pointer.worldPoint.x);
    const tileY = Math.round(pointer.worldPoint.y);
    const tileElevation = this.map.getElevationAt(tileX, tileY);
    const clickedBox = lootField.getBoxAt(tileX, tileY, this.map);
    const clickedDistance = Math.hypot(tileX - playerPosition.x, tileY - playerPosition.y);
    if (
      Math.abs(tileElevation - pointer.elevation) <= GAME_CONFIG.lootElevationTolerance &&
      clickedBox &&
      clickedDistance <= this.interactRange
    ) {
      return { x: tileX, y: tileY };
    }

    const hit = lootField.findNearestBox(
      pointer.worldPoint.x,
      pointer.worldPoint.y,
      this.interactRange,
      this.map,
    );
    if (
      hit &&
      Math.hypot(hit.x - playerPosition.x, hit.y - playerPosition.y) <= this.interactRange &&
      Math.abs(this.map.getElevationAt(hit.x, hit.y) - pointer.elevation) <= GAME_CONFIG.lootElevationTolerance
    ) {
      return { x: hit.x, y: hit.y };
    }

    return null;
  }
}
