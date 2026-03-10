import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  type System,
} from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { LootUiState } from "../state/LootUiState.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { LootBoxField } from "../world/LootBoxField.ts";

export type LootInteractSystemOptions = {
  interactRange: number;
};

export class LootInteractSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly lootField: LootBoxField,
    private readonly player: PlayerEntity,
    private readonly ui: LootUiState,
    private readonly options: LootInteractSystemOptions,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public update(): void {
    const open = this.ui.openBox;
    if (open && !this.lootField.getBoxAt(open.x, open.y, this.map)) {
      this.ui.close();
    }

    const pressed = this.runtime.input.isPressed("e") || this.runtime.input.isPressed("E");
    if (!pressed) {
      return;
    }

    const playerPosition = this.player.getComponent(TransformComponent).transform.position;
    const nearest = this.lootField.findNearestBox(
      playerPosition.x,
      playerPosition.y,
      this.options.interactRange,
      this.map,
    );

    if (!nearest) {
      return;
    }

    this.ui.open(nearest.x, nearest.y);
  }
}
