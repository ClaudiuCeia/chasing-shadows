import {
  EcsRuntime,
  HudInputRouter,
  HudLayoutNodeComponent,
  Scene,
  type RenderSystem,
} from "@claudiu-ceia/tick";
import { GAME_CONFIG } from "../../game/config/game-config.ts";
import { HudRootEntity } from "../../game/entities/HudRootEntity.ts";
import { TitleMenuInputComponent } from "../../game/ui/TitleMenuInputComponent.ts";
import { TitleMenuRenderComponent } from "../../game/ui/TitleMenuRenderComponent.ts";
import { TitleMenuState } from "../../game/ui/TitleMenuState.ts";

export type TitleSceneOptions = {
  runtime: EcsRuntime;
  renderSystem: RenderSystem;
  onContinue: () => void;
  onRestart: () => void;
};

export class TitleScene extends Scene {
  private root: HudRootEntity | null = null;

  public constructor(private readonly options: TitleSceneOptions) {
    super();
  }

  public override awake(): void {
    const state = new TitleMenuState();
    EcsRuntime.runWith(this.options.runtime, () => {
      const root = new HudRootEntity();
      root.addComponent(
        new HudLayoutNodeComponent({
          width: GAME_CONFIG.hudReferenceWidth,
          height: GAME_CONFIG.hudReferenceHeight,
          anchor: "center",
        }),
      );
      root.addComponent(new TitleMenuRenderComponent(state));
      root.addComponent(
        new TitleMenuInputComponent(state, this.options.onContinue, this.options.onRestart),
      );
      root.awake();
      this.root = root;
    });
  }

  public override update(_dt: number): void {}

  public override render(_ctx: CanvasRenderingContext2D): void {
    this.options.renderSystem.render();
  }

  public override destroy(): void {
    this.root?.destroy();
    this.root = null;
    HudInputRouter.detach(this.options.runtime);
    this.options.runtime.input.dispose();
  }
}
