import { Entity } from "@claudiu-ceia/tick";
import { DebugOverlayComponent } from "../components/DebugOverlayComponent.ts";
import { LootUiComponent } from "../components/LootUiComponent.ts";
import { PointerWorldComponent } from "../components/PointerWorldComponent.ts";

export class UiStateEntity extends Entity {
  public readonly debugOverlay = new DebugOverlayComponent();
  public readonly lootUi = new LootUiComponent();
  public readonly pointerWorld = new PointerWorldComponent();

  public constructor() {
    super();
    this.addComponent(this.debugOverlay);
    this.addComponent(this.lootUi);
    this.addComponent(this.pointerWorld);
  }

  public override update(dt: number): void {
    super.update(dt);
  }
}
