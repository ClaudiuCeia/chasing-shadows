import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { ModalStateComponent } from "../components/ModalStateComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { getLootSourceSnapshot } from "../loot/loot-sources.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

export type LootInteractSystemOptions = {
  interactRange: number;
};

export class LootInteractSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private uiQuery: EntityQuery | null = null;
  private worldQuery: EntityQuery | null = null;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
    private readonly options: LootInteractSystemOptions,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.uiQuery = this.runtime.registry.query().with(LootUiComponent).with(ModalStateComponent);
    this.worldQuery = this.runtime.registry.query().with(LootFieldComponent);
  }

  public update(): void {
    if (!this.uiQuery || !this.worldQuery) {
      return;
    }

    const ui = getSingletonComponent(this.uiQuery, LootUiComponent);
    const modalState = getSingletonComponent(this.uiQuery, ModalStateComponent);
    const lootField = getSingletonComponent(this.worldQuery, LootFieldComponent);
    if (!ui || !modalState || !lootField) {
      return;
    }

    const open = ui.openSource;
    if (open && !getLootSourceSnapshot(open, lootField, this.map)) {
      if (ui.draggedItem?.hiddenOrigin?.section === "source") {
        if (ui.hoveredSlot?.section === "source") {
          ui.hoveredSlot = null;
        }
        return;
      }

      ui.openSource = null;
      if (ui.hoveredSlot?.section === "source") {
        ui.hoveredSlot = null;
      }
    }

    const pressed = this.runtime.input.isPressed("e") || this.runtime.input.isPressed("E");
    if (!pressed) {
      return;
    }

    const playerPosition = this.player.getComponent(TransformComponent).transform.position;
    const nearest = lootField.findNearestBox(
      playerPosition.x,
      playerPosition.y,
      this.options.interactRange,
      this.map,
    );

    if (nearest) {
      ui.openTileBox(nearest.x, nearest.y);
      modalState.open("inventory");
    }
  }
}
