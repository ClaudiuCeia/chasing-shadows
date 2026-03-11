import { Entity, HudLayoutNodeComponent } from "@claudiu-ceia/tick";
import { FpsCounterRenderComponent, type FpsSnapshot } from "./FpsCounterRenderComponent.ts";
import { HudInfoRenderComponent, type HudInfoSnapshot } from "./HudInfoRenderComponent.ts";
import { HudTemperatureRenderComponent, type HudTemperatureSnapshot } from "./HudTemperatureRenderComponent.ts";
import { LootWindowInputComponent } from "./LootWindowInputComponent.ts";
import { LootWindowRenderComponent, type LootWindowSnapshot } from "./LootWindowRenderComponent.ts";
import { QuickbarRenderComponent } from "./QuickbarRenderComponent.ts";
import type { InventoryState } from "../state/InventoryState.ts";
import type { LootUiState } from "../state/LootUiState.ts";

class HudNodeEntity extends Entity {
  public override update(_dt: number): void {}
}

export type CreateHudOptions = {
  getInfo: () => HudInfoSnapshot;
  getTemperature: () => HudTemperatureSnapshot;
  getFps: () => FpsSnapshot;
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
      width: 276,
      height: 78,
      anchor: "top-left",
      offset: { x: 18, y: 18 },
    }),
  );
  info.addComponent(new HudInfoRenderComponent(options.getInfo));

  const temperature = new HudNodeEntity();
  temperature.addComponent(
    new HudLayoutNodeComponent({
      width: 108,
      height: 38,
      anchor: "top-right",
      offset: { x: -18, y: 18 },
    }),
  );
  temperature.addComponent(new HudTemperatureRenderComponent(options.getTemperature));

  const quickbar = new HudNodeEntity();
  quickbar.addComponent(
    new HudLayoutNodeComponent({
      width: 620,
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
  temperature.awake();
  quickbar.awake();
  fpsCounter.awake();
  lootWindow.awake();
  return [info, temperature, quickbar, fpsCounter, lootWindow];
};
