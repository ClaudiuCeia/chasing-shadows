import { Entity } from "@claudiu-ceia/tick";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { PointerWorldComponent } from "../components/PointerWorldComponent.ts";

export class UiStateEntity extends Entity {
  public readonly lootUi = new LootUiComponent();
  public readonly pointerWorld = new PointerWorldComponent();

  public constructor() {
    super();
    this.addComponent(this.lootUi);
    this.addComponent(this.pointerWorld);
  }

  public override update(_dt: number): void {}
}
