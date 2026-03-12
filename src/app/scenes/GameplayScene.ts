import { Scene, type EcsRuntime, type World } from "@claudiu-ceia/tick";
import { LootUiComponent } from "../../game/components/LootUiComponent.ts";

export type GameplaySceneOptions = {
  runtime: EcsRuntime;
  world: World;
  lootUi: LootUiComponent;
  onOpenTitle: () => void;
  renderFrame: () => void;
};

export class GameplayScene extends Scene {
  public constructor(private readonly options: GameplaySceneOptions) {
    super();
  }

  public override awake(): void {
    this.options.runtime.input.init(window);
  }

  public override update(dt: number): void {
    if (this.options.runtime.input.isPressed("Escape")) {
      this.options.lootUi.close();
      this.options.onOpenTitle();
      return;
    }

    this.options.world.step(dt);

    for (const entity of this.options.runtime.registry.getAllEntities()) {
      if (!entity.isAwake || entity.parent !== null) {
        continue;
      }

      entity.update(dt);
    }
  }

  public override render(_ctx: CanvasRenderingContext2D): void {
    this.options.renderFrame();
  }

  public override destroy(): void {
    this.options.runtime.input.dispose();
  }
}
