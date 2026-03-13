import { EcsRuntime, SystemPhase, SystemTickMode, TransformComponent, type Entity, type EntityQuery, type System } from "@claudiu-ceia/tick";
import { HighlightComponent } from "../components/HighlightComponent.ts";
import { InteractableComponent } from "../components/InteractableComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";

type InteractableEntity = Entity & {
  getComponent(constr: typeof InteractableComponent): InteractableComponent;
  getComponent(constr: typeof HighlightComponent): HighlightComponent;
  getComponent(constr: typeof TransformComponent): TransformComponent;
};

export class InteractableHighlightSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(
    private readonly player: PlayerEntity,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(InteractableComponent).with(HighlightComponent).with(TransformComponent);
  }

  public update(): void {
    if (!this.query) {
      return;
    }

    const playerPosition = this.player.transform.transform.position;
    let nearest: InteractableEntity | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const entity of this.query.run() as InteractableEntity[]) {
      const interactable = entity.getComponent(InteractableComponent);
      const highlight = entity.getComponent(HighlightComponent);
      highlight.active = false;

      if (!interactable.enabled) {
        continue;
      }

      const position = entity.getComponent(TransformComponent).transform.position;
      const distance = Math.hypot(position.x - playerPosition.x, position.y - playerPosition.y);
      if (distance > interactable.range || distance >= nearestDistance) {
        continue;
      }

      nearest = entity;
      nearestDistance = distance;
    }

    if (nearest) {
      nearest.getComponent(HighlightComponent).active = true;
    }
  }
}
