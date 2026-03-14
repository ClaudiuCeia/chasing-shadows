import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { RaycastEmitterComponent } from "../components/RaycastEmitterComponent.ts";
import { HitColliderEntity } from "../entities/HitColliderEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import {
  castRaySegment,
  getHorizontalRayDirections,
  prepareHitColliders,
  toRaycastPoint,
  type RaycastableEntity,
} from "./raycast-helpers.ts";

export class RaycastSystem implements System {
  public readonly phase = SystemPhase.Render;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry
      .query()
      .with(TransformComponent)
      .with(RaycastEmitterComponent);
  }

  public update(): void {
    if (!this.query) {
      return;
    }

    const hitColliders = prepareHitColliders(
      this.map,
      this.runtime.registry
        .getAllEntities()
        .filter((entity): entity is HitColliderEntity => entity instanceof HitColliderEntity),
    );
    for (const entity of this.query.run() as RaycastableEntity[]) {
      const emitter = entity.getComponent(RaycastEmitterComponent);
      if (!emitter.enabled) {
        emitter.clearRays();
        continue;
      }

      const transform = entity.getComponent(TransformComponent).transform;
      const originXY = transform.position;
      const baseElevation = this.map.getElevationAt(originXY.x, originXY.y);
      const originZ = baseElevation + emitter.originHeight;
      const directions = getHorizontalRayDirections(
        transform.rotation,
        emitter.fovRadians,
        emitter.rayCount,
      );
      const rays = directions.map((direction) =>
        castRaySegment(
          this.map,
          entity,
          toRaycastPoint(originXY, originZ),
          toRaycastPoint(originXY.add(direction.multiply(emitter.maxDistance)), originZ),
          hitColliders,
        ),
      );
      emitter.setRays(rays);
    }
  }
}
