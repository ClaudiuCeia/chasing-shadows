import { Entity, HudLayoutNodeComponent, Vector2D } from "@claudiu-ceia/tick";
import { HudButtonInputComponent } from "./HudButtonInputComponent.ts";
import { HudButtonRenderComponent } from "./HudButtonRenderComponent.ts";
import { HudButtonStateComponent } from "./HudButtonStateComponent.ts";

export type HudButtonEntityOptions = {
  label: string;
  width: number;
  height: number;
  anchor?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  offset?: { x: number; y: number };
  order?: number;
  onClick: () => void;
};

export class HudButtonEntity extends Entity {
  public readonly state = new HudButtonStateComponent();
  public readonly layout: HudLayoutNodeComponent;

  public constructor(options: HudButtonEntityOptions) {
    super();
    this.layout = new HudLayoutNodeComponent({
      width: options.width,
      height: options.height,
      anchor: options.anchor ?? "top-left",
      offset: options.offset ? new Vector2D(options.offset.x, options.offset.y) : Vector2D.zero,
      order: options.order,
    });

    this.addComponent(this.layout);
    this.addComponent(this.state);
    this.addComponent(new HudButtonRenderComponent({ label: options.label }));
    this.addComponent(new HudButtonInputComponent(options.onClick));
  }
}
