import { EcsRuntime, SystemPhase, SystemTickMode, type EntityQuery, type System } from "@claudiu-ceia/tick";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { ModalStateComponent } from "../components/ModalStateComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { restoreDraggedInventoryItem } from "../ui/inventory-slots.ts";

export class InventoryModalSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;

  public constructor(
    private readonly inventory: InventoryComponent,
    private readonly lootField: LootFieldComponent,
    private readonly map: InfiniteTilemap,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(LootUiComponent).with(ModalStateComponent);
  }

  public update(): void {
    if (!this.query) {
      return;
    }

    if (!(this.runtime.input.isPressed("i") || this.runtime.input.isPressed("I"))) {
      return;
    }

    const ui = getSingletonComponent(this.query, LootUiComponent);
    const modalState = getSingletonComponent(this.query, ModalStateComponent);
    if (!ui || !modalState) {
      return;
    }

    if (modalState.activeModal === "inventory") {
      restoreDraggedInventoryItem(ui, this.inventory, this.lootField, this.map);
      ui.close();
      modalState.close("inventory");
      return;
    }

    ui.openSource = null;
    ui.hoveredSlot = null;
    ui.draggedItem = null;
    ui.dragHudPoint = null;
    modalState.open("inventory");
  }
}
