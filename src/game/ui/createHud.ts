import { Entity, HudLayoutNodeComponent } from "@claudiu-ceia/tick";
import { HudButtonRenderComponent } from "./HudButtonRenderComponent.ts";
import { createButtonVisualState } from "./HudButtonVisualState.ts";
import { HudInfoRenderComponent, type HudInfoSnapshot } from "./HudInfoRenderComponent.ts";
import { StartOverButtonInputComponent } from "./StartOverButtonInputComponent.ts";

class HudNodeEntity extends Entity {
  public override update(_dt: number): void {}
}

export type CreateHudOptions = {
  getInfo: () => HudInfoSnapshot;
  onStartOver: () => void;
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

  info.awake();
  button.awake();
  return [info, button];
};
