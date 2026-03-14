import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type Entity,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { HighlightComponent } from "../components/HighlightComponent.ts";
import { PointerWorldComponent } from "../components/PointerWorldComponent.ts";
import { TargetableComponent } from "../components/TargetableComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { toRaycastPoint } from "./raycast-helpers.ts";

const TARGET_HOVER_RADIUS_PX = 48;

type TargetableEntity = Entity & {
  getComponent(constr: typeof HighlightComponent): HighlightComponent;
  getComponent(constr: typeof TargetableComponent): TargetableComponent;
  getComponent(constr: typeof TransformComponent): TransformComponent;
};

export class TargetHoverSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private readonly player: PlayerEntity;
  private pointerQuery: EntityQuery | null = null;
  private targetQuery: EntityQuery | null = null;

  public constructor(
    camera: IsometricCameraEntity,
    private readonly canvas: HTMLCanvasElement,
    private readonly map: InfiniteTilemap,
    player: PlayerEntity,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.camera = camera;
    this.player = player;
    this.runtime = runtime;
  }

  private readonly camera: IsometricCameraEntity;

  public awake(): void {
    this.pointerQuery = this.runtime.registry.query().with(PointerWorldComponent);
    this.targetQuery = this.runtime.registry.query().with(TargetableComponent).with(HighlightComponent).with(TransformComponent);
  }

  public update(): void {
    const pointer = this.pointerQuery ? getSingletonComponent(this.pointerQuery, PointerWorldComponent) : null;
    if (!pointer || !this.targetQuery) {
      return;
    }

    const canvasPoint = pointer.canvasPoint;
    const canvasSize = new Vector2D(this.canvas.width, this.canvas.height);
    let hoveredTarget: TargetableEntity | null = null;
    let hoveredPoint = null as ReturnType<typeof toRaycastPoint> | null;
    let bestDistanceSq = TARGET_HOVER_RADIUS_PX * TARGET_HOVER_RADIUS_PX;

    this.player.weaponRaycast.clearHover();

    for (const entity of this.targetQuery.run() as TargetableEntity[]) {
      const highlight = entity.getComponent(HighlightComponent);
      highlight.active = false;

      const targetable = entity.getComponent(TargetableComponent);
      if (!targetable.enabled || !canvasPoint) {
        continue;
      }

      const transform = entity.getComponent(TransformComponent).transform;
      const baseElevation = entity.hasComponent(TilePositionComponent)
        ? entity.getComponent(TilePositionComponent).z
        : this.map.getElevationAt(transform.position.x, transform.position.y);
      const targetPoint = toRaycastPoint(transform.position, baseElevation + targetable.aimHeight);
      const screenPoint = this.camera.toCanvasAt(transform.position, targetPoint.z, canvasSize);
      const dx = screenPoint.x - canvasPoint.x;
      const dy = screenPoint.y - canvasPoint.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > bestDistanceSq) {
        continue;
      }

      bestDistanceSq = distanceSq;
      hoveredTarget = entity;
      hoveredPoint = targetPoint;
    }

    if (!hoveredTarget || !hoveredPoint) {
      return;
    }

    hoveredTarget.getComponent(HighlightComponent).active = true;
    this.player.weaponRaycast.hoveredTarget = hoveredTarget;
    this.player.weaponRaycast.targetPoint = hoveredPoint;
  }
}
