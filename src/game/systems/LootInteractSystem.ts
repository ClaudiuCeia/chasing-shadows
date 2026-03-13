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
import { getLootSourceSnapshot, setLootSourceSlots } from "../loot/loot-sources.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { ItemTransferSystem } from "./ItemTransferSystem.ts";

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
      ui.close();
      modalState.close("loot");
    }

    if (ui.pendingSlotClick !== null && ui.openSource) {
      this.processSlotClick(ui, lootField, ui.pendingSlotClick);
      ui.pendingSlotClick = null;
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
      modalState.open("loot");
    }
  }

  private processSlotClick(ui: LootUiComponent, lootField: LootFieldComponent, slot: number): void {
    const open = ui.openSource;
    if (!open) {
      return;
    }

    const snapshot = getLootSourceSnapshot(open, lootField, this.map);
    if (!snapshot) {
      ui.close();
      const modalState = this.uiQuery ? getSingletonComponent(this.uiQuery, ModalStateComponent) : null;
      modalState?.close("loot");
      return;
    }

    const stack = snapshot.slots[slot] ?? null;
    if (!stack) {
      return;
    }

    const leftover = ItemTransferSystem.addItem(this.player.inventory, stack.itemId, stack.count);
    if (leftover >= stack.count) {
      return;
    }

    const updatedSlots = [...snapshot.slots];
    updatedSlots[slot] = leftover > 0 ? { itemId: stack.itemId, count: leftover } : null;
    setLootSourceSlots(open, updatedSlots, lootField, this.map);

    if (!getLootSourceSnapshot(open, lootField, this.map)) {
      ui.close();
      const modalState = this.uiQuery ? getSingletonComponent(this.uiQuery, ModalStateComponent) : null;
      modalState?.close("loot");
    }
  }
}
