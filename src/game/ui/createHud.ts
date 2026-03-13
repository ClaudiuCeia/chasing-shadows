import { DebugOverlayComponent } from "../components/DebugOverlayComponent.ts";
import { ModalStateComponent } from "../components/ModalStateComponent.ts";
import { Entity, HudLayoutNodeComponent } from "@claudiu-ceia/tick";
import { FpsCounterRenderComponent, type FpsSnapshot } from "./FpsCounterRenderComponent.ts";
import { HudDebugRenderComponent } from "./HudDebugRenderComponent.ts";
import { HudInfoRenderComponent } from "./HudInfoRenderComponent.ts";
import { HudTemperatureRenderComponent } from "./HudTemperatureRenderComponent.ts";
import { LootWindowInputComponent } from "./LootWindowInputComponent.ts";
import { LootWindowRenderComponent } from "./LootWindowRenderComponent.ts";
import { HudButtonEntity } from "./HudButtonEntity.ts";
import { INVENTORY_MODAL_HEIGHT, INVENTORY_MODAL_WIDTH } from "./inventory-layout.ts";
import { QuickbarRenderComponent } from "./QuickbarRenderComponent.ts";
import { restoreDraggedInventoryItem } from "./inventory-slots.ts";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import type { TerminatorComponent } from "../components/TerminatorComponent.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

class HudNodeEntity extends Entity {
  public override update(dt: number): void {
    super.update(dt);
  }
}

export type CreateHudOptions = {
  getFps: () => FpsSnapshot;
  player: PlayerEntity;
  debug: DebugOverlayComponent;
  terminator: TerminatorComponent;
  inventory: InventoryComponent;
  lootUi: LootUiComponent;
  modalState: ModalStateComponent;
  lootField: LootFieldComponent;
  map: InfiniteTilemap;
};

export const createHud = (options: CreateHudOptions): Entity[] => {
  const info = new HudNodeEntity();
  info.addComponent(
    new HudLayoutNodeComponent({
      width: 276,
      height: 78,
      anchor: "top-left",
      offset: { x: 18, y: 18 },
    }),
  );
  info.addComponent(new HudInfoRenderComponent(options.player, options.terminator));

  const debug = new HudNodeEntity();
  debug.addComponent(
    new HudLayoutNodeComponent({
      width: 190,
      height: 140,
      anchor: "top-left",
      offset: { x: 18, y: 104 },
      order: 20,
    }),
  );
  debug.addComponent(new HudDebugRenderComponent(options.debug, options.player));

  const temperature = new HudNodeEntity();
  temperature.addComponent(
    new HudLayoutNodeComponent({
      width: 108,
      height: 38,
      anchor: "top-right",
      offset: { x: -18, y: 18 },
    }),
  );
  temperature.addComponent(new HudTemperatureRenderComponent(options.player, options.terminator));

  const quickbar = new HudNodeEntity();
  quickbar.addComponent(
    new HudLayoutNodeComponent({
      width: 330,
      height: 82,
      anchor: "bottom-center",
      offset: { x: 0, y: -18 },
    }),
  );
  quickbar.addComponent(new QuickbarRenderComponent(options.inventory));

  const fpsCounter = new HudNodeEntity();
  fpsCounter.addComponent(
    new HudLayoutNodeComponent({
      width: 75,
      height: 38,
      anchor: "bottom-right",
      offset: { x: -12, y: -12 },
      order: 95,
    }),
  );
  fpsCounter.addComponent(new FpsCounterRenderComponent(options.getFps));

  const lootWindow = new HudNodeEntity();
  lootWindow.addComponent(
    new HudLayoutNodeComponent({
      width: INVENTORY_MODAL_WIDTH.inventoryOnly,
      height: INVENTORY_MODAL_HEIGHT,
      anchor: "center",
      offset: { x: 0, y: 18 },
      order: 90,
    }),
  );

  const lootCloseButton = new HudButtonEntity({
    label: "CLOSE",
    width: 76,
    height: 30,
    anchor: "bottom-right",
    offset: { x: -34, y: -20 },
    order: 2,
    onClick: () => {
      restoreDraggedInventoryItem(options.lootUi, options.inventory, options.lootField, options.map);
      options.lootUi.close();
      options.modalState.close("inventory");
    },
  });
  lootCloseButton.layout.setVisible(false);
  lootCloseButton.layout.setInteractive(false);
  lootWindow.addChild(lootCloseButton);

  lootWindow.addComponent(
    new LootWindowRenderComponent(
      options.map,
      options.lootField,
      options.inventory,
      options.lootUi,
      options.modalState,
      lootCloseButton,
    ),
  );
  lootWindow.addComponent(
    new LootWindowInputComponent(options.lootUi, options.modalState, options.inventory, options.lootField, options.map),
  );

  info.awake();
  debug.awake();
  temperature.awake();
  quickbar.awake();
  fpsCounter.awake();
  lootWindow.awake();
  return [info, debug, temperature, quickbar, fpsCounter, lootWindow];
};
