import { Entity, HudLayoutNodeComponent } from "@claudiu-ceia/tick";
import { HudButtonRenderComponent } from "./HudButtonRenderComponent.ts";
import { createButtonVisualState } from "./HudButtonVisualState.ts";
import { HudInfoRenderComponent, type HudInfoSnapshot } from "./HudInfoRenderComponent.ts";
import { LootWindowInputComponent } from "./LootWindowInputComponent.ts";
import { LootWindowRenderComponent, type LootWindowSnapshot } from "./LootWindowRenderComponent.ts";
import { QuickbarRenderComponent } from "./QuickbarRenderComponent.ts";
import { StartOverButtonInputComponent } from "./StartOverButtonInputComponent.ts";
import { InventoryState } from "../state/InventoryState.ts";
import { LootUiState } from "../state/LootUiState.ts";

class HudNodeEntity extends Entity {
  public override update(_dt: number): void {}
}

export type CreateHudOptions = {
  getInfo: () => HudInfoSnapshot;
  onStartOver: () => void;
  inventory: InventoryState;
  lootUi: LootUiState;
  getLootWindow: () => LootWindowSnapshot | null;
  onLootSlotClick: (slot: number) => void;
  onLootClose: () => void;
};

export const createHud = (options: CreateHudOptions): Entity[] => {
  const info = new HudNodeEntity();
  info.addComponent(
    new HudLayoutNodeComponent({
      width: 420,
      height: 220,
      anchor: "top-left",
      offset: { x: 24, y: 24 },
    }),
  );
  info.addComponent(new HudInfoRenderComponent(options.getInfo));

  const button = new HudNodeEntity();
  const buttonVisual = createButtonVisualState();
  button.addComponent(
    new HudLayoutNodeComponent({
      width: 260,
      height: 70,
      anchor: "top-right",
      offset: { x: -24, y: 24 },
    }),
  );
  button.addComponent(new HudButtonRenderComponent("Start Over (R)", buttonVisual));
  button.addComponent(new StartOverButtonInputComponent(buttonVisual, options.onStartOver));

  const quickbar = new HudNodeEntity();
  quickbar.addComponent(
    new HudLayoutNodeComponent({
      width: 900,
      height: 120,
      anchor: "bottom-center",
      offset: { x: 0, y: -26 },
    }),
  );
  quickbar.addComponent(new QuickbarRenderComponent(options.inventory));

  const lootWindow = new HudNodeEntity();
  lootWindow.addComponent(
    new HudLayoutNodeComponent({
      width: 460,
      height: 560,
      anchor: "center",
      offset: { x: 0, y: 18 },
      order: 90,
    }),
  );
  lootWindow.addComponent(new LootWindowRenderComponent(options.getLootWindow, options.lootUi));
  lootWindow.addComponent(
    new LootWindowInputComponent(
      options.lootUi,
      () => options.getLootWindow() !== null,
      options.onLootSlotClick,
      options.onLootClose,
    ),
  );

  info.awake();
  button.awake();
  quickbar.awake();
  lootWindow.awake();
  return [info, button, quickbar, lootWindow];
};
