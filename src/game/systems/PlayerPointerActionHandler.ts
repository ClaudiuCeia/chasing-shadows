import { Vector2D } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { getDefaultAttackSelection, getPlayerMovementProfile } from "../render/player-animation-logic.ts";
import { screenVectorToDirectionIndex } from "../render/player-sprite-math.ts";
import type { PointerWorldActionPhase, PointerWorldActionResult } from "./PointerMarkerSystem.ts";
import { LootUiState } from "../state/LootUiState.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { LootBoxField } from "../world/LootBoxField.ts";
import { worldToIso } from "../../shared/math/iso.ts";

export class PlayerPointerActionHandler {
  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly lootField: LootBoxField,
    private readonly lootUi: LootUiState,
    private readonly player: PlayerEntity,
  ) {}

  public handleWorldAction(
    worldPoint: Vector2D | null,
    _canvasPoint: Vector2D | null,
    elevation: number | null,
    phase: PointerWorldActionPhase,
  ): PointerWorldActionResult {
    if (!worldPoint || elevation === null) {
      if (phase === "release") {
        this.player.attack.handleTrigger(null, null, null, "release");
      }
      return null;
    }

    const transform = this.player.transform.transform;
    const facingVector = new Vector2D(Math.cos(transform.rotation), Math.sin(transform.rotation));

    if (phase === "press") {
      const tileX = Math.round(worldPoint.x);
      const tileY = Math.round(worldPoint.y);
      const tileElevation = this.map.getElevationAt(tileX, tileY);
      if (Math.abs(tileElevation - elevation) <= 0.6 && this.lootField.getBoxAt(tileX, tileY, this.map)) {
        this.lootUi.open(tileX, tileY);
        return "interaction";
      }

      const hit = this.lootField.findNearestBox(
        worldPoint.x,
        worldPoint.y,
        GAME_CONFIG.lootBoxClickRange,
        this.map,
      );
      const validHit =
        hit && Math.abs(this.map.getElevationAt(hit.x, hit.y) - elevation) <= 0.6 ? hit : null;
      if (validHit) {
        this.lootUi.open(validHit.x, validHit.y);
        return "interaction";
      }
    }

    const profile = getPlayerMovementProfile(
      this.player.getComponent(MovementIntentComponent),
      this.player.getComponent(TopDownControllerComponent),
      this.player.body.getVelocity(),
      facingVector,
    );
    const facingIso = worldToIso(facingVector, {
      tileWidth: GAME_CONFIG.tileWidth,
      tileHeight: GAME_CONFIG.tileHeight,
    });
    const attack = getDefaultAttackSelection(profile);
    const directionIndex = screenVectorToDirectionIndex(facingIso);

    return this.player.attack.handleTrigger(
      attack.clip,
      directionIndex,
      attack.playbackDirection,
      phase,
    )
      ? "attack"
      : null;
  }
}
