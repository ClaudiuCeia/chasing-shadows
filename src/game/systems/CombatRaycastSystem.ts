import { EcsRuntime, SystemPhase, SystemTickMode, Vector2D, type System } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { getWeaponCombatStats } from "../items/item-catalog.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { castRaySegment, collectPreparedHitColliders, toRaycastPoint } from "./raycast-helpers.ts";

const DEFAULT_WEAPON_DISTANCE = 28;
const MIN_TARGETING_DISTANCE = 0.001;
const JITTER_Z_SCALE = 0.3;
const JITTER_DISTANCE_SCALE = 0.35;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const CENTER_WEIGHT_EXPONENT = 1.65;

export class CombatRaycastSystem implements System {
  public readonly phase = SystemPhase.Render;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {}

  public update(): void {
    const weaponRaycast = this.player.weaponRaycast;
    const previousWeaponItemId = weaponRaycast.weaponItemId;
    const previousMode = weaponRaycast.mode;
    const activeWeapon = this.player.inventory.getEquippedWeaponForActiveSlot();
    if (!activeWeapon) {
      weaponRaycast.weaponItemId = null;
      weaponRaycast.mode = null;
      weaponRaycast.clearHover();
      weaponRaycast.clearRays();
      return;
    }

    const definition = getWeaponCombatStats(activeWeapon.itemId);
    if (!definition) {
      weaponRaycast.weaponItemId = activeWeapon.itemId;
      weaponRaycast.mode = null;
      weaponRaycast.clearRays();
      return;
    }

    weaponRaycast.weaponItemId = activeWeapon.itemId;
    const origin = toRaycastPoint(
      this.player.transform.transform.position,
      this.player.tilePosition.z + this.player.hitCollider.bodyHeight * 0.72,
    );
    const maxDistance = Math.max(this.player.rayEmitter.maxDistance, DEFAULT_WEAPON_DISTANCE);
    const spreadDegrees = Math.max(0, definition.spreadDegrees);
    const rayCount = Math.max(1, Math.round(spreadDegrees));
    const fovRadians = (spreadDegrees * Math.PI) / 180;
    const hoveredTargetPoint = weaponRaycast.targetPoint;
    const mode = hoveredTargetPoint ? "targeted" : "fire-at-will";
    const baseAngles = this.getBaseAngles(origin, hoveredTargetPoint, maxDistance);
    const aimSignature = this.createAimSignature(origin, hoveredTargetPoint, baseAngles.yaw, baseAngles.pitch, maxDistance, rayCount);
    const shotChanged = this.player.attack.shotCounter !== weaponRaycast.lastResolvedShotCounter;
    const aimChanged = aimSignature !== weaponRaycast.lastAimSignature;
    const weaponChanged = activeWeapon.itemId !== previousWeaponItemId;
    const modeChanged = mode !== previousMode;

    if (shotChanged) {
      weaponRaycast.setRays(
        this.buildRays(origin, maxDistance, baseAngles.yaw, baseAngles.pitch, fovRadians, rayCount, definition.accuracy),
      );
      weaponRaycast.lastResolvedShotCounter = this.player.attack.shotCounter;
      weaponRaycast.lastAimSignature = aimSignature;
    } else if (weaponRaycast.rays.length === 0 || aimChanged || weaponChanged || modeChanged) {
      weaponRaycast.setRays(
        this.buildRays(origin, maxDistance, baseAngles.yaw, baseAngles.pitch, fovRadians, rayCount, 1),
      );
      weaponRaycast.lastAimSignature = aimSignature;
    }

    weaponRaycast.mode = mode;
    weaponRaycast.weaponItemId = activeWeapon.itemId;
  }

  private createAimSignature(
    origin: ReturnType<typeof toRaycastPoint>,
    targetPoint: ReturnType<typeof toRaycastPoint> | null,
    yaw: number,
    pitch: number,
    maxDistance: number,
    rayCount: number,
  ): string {
    const roundedTarget = targetPoint
      ? `${targetPoint.x.toFixed(2)}:${targetPoint.y.toFixed(2)}:${targetPoint.z.toFixed(2)}`
      : "none";
    return [
      origin.x.toFixed(2),
      origin.y.toFixed(2),
      origin.z.toFixed(2),
      roundedTarget,
      yaw.toFixed(4),
      pitch.toFixed(4),
      maxDistance.toFixed(2),
      `${rayCount}`,
    ].join("|");
  }

  private getBaseAngles(
    origin: ReturnType<typeof toRaycastPoint>,
    targetPoint: ReturnType<typeof toRaycastPoint> | null,
    maxDistance: number,
  ): { yaw: number; pitch: number } {
    if (!targetPoint) {
      return {
        yaw: this.player.transform.transform.rotation,
        pitch: 0,
      };
    }

    const dx = targetPoint.x - origin.x;
    const dy = targetPoint.y - origin.y;
    const horizontalDistance = Math.max(MIN_TARGETING_DISTANCE, Math.hypot(dx, dy));
    const clampedDistance = Math.min(maxDistance, horizontalDistance);
    return {
      yaw: Math.atan2(dy, dx),
      pitch: Math.atan2(targetPoint.z - origin.z, clampedDistance),
    };
  }

  private buildRays(
    origin: ReturnType<typeof toRaycastPoint>,
    maxDistance: number,
    baseYaw: number,
    basePitch: number,
    fovRadians: number,
    rayCount: number,
    accuracy: number,
  ) {
    const preparedHitColliders = collectPreparedHitColliders(this.runtime, this.map);
    const offsets = this.getConeOffsets(fovRadians, rayCount);
    const clampedAccuracy = Math.max(0, Math.min(1, accuracy));
    const jitterRadius = (1 - clampedAccuracy) * maxDistance * JITTER_DISTANCE_SCALE;

    return offsets.map((offset) => {
      const yaw = baseYaw + offset.yaw;
      const pitch = basePitch + offset.pitch;
      const horizontalDirection = new Vector2D(Math.cos(yaw), Math.sin(yaw));
      const end = toRaycastPoint(
        new Vector2D(origin.x, origin.y).add(horizontalDirection.multiply(maxDistance)),
        origin.z + Math.tan(pitch) * maxDistance,
      );
      const jitteredEnd = jitterRadius <= 0 ? end : this.jitterEndPoint(end, jitterRadius);
      return castRaySegment(this.map, this.player, origin, jitteredEnd, preparedHitColliders);
    });
  }

  private getConeOffsets(fovRadians: number, rayCount: number): Array<{ yaw: number; pitch: number }> {
    if (rayCount <= 1 || fovRadians <= 0.0001) {
      return [{ yaw: 0, pitch: 0 }];
    }

    const offsets = Array.from({ length: rayCount }, () => ({ yaw: 0, pitch: 0 }));
    const primaryIndex = Math.floor(rayCount / 2);
    const halfAngle = fovRadians / 2;
    const remainingCount = rayCount - 1;

    let leftIndex = primaryIndex - 1;
    let rightIndex = primaryIndex + 1;
    for (let sampleIndex = 1; sampleIndex <= remainingCount; sampleIndex++) {
      const radius = halfAngle * Math.pow(sampleIndex / remainingCount, CENTER_WEIGHT_EXPONENT);
      const theta = sampleIndex * GOLDEN_ANGLE;
      const nextOffset = {
        yaw: Math.cos(theta) * radius,
        pitch: Math.sin(theta) * radius,
      };

      if (leftIndex >= 0) {
        offsets[leftIndex] = nextOffset;
        leftIndex -= 1;
        continue;
      }

      if (rightIndex < offsets.length) {
        offsets[rightIndex] = nextOffset;
        rightIndex += 1;
      }
    }

    return offsets;
  }

  private jitterEndPoint(end: ReturnType<typeof toRaycastPoint>, radius: number) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    return {
      x: end.x + Math.cos(angle) * distance,
      y: end.y + Math.sin(angle) * distance,
      z: end.z + (Math.random() * 2 - 1) * radius * JITTER_Z_SCALE,
    };
  }
}
