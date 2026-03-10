import { SystemPhase, SystemTickMode, type System } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

export class PlayerTilePositionSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Frame;

  public constructor(
    private readonly map: InfiniteTilemap,
    private readonly player: PlayerEntity,
  ) {}

  public update(): void {
    const position = this.player.transform.transform.position;
    const elevation = this.map.getTile(position.x, position.y).elevation;
    this.player.tilePosition.set(position.x, position.y, elevation);
  }
}
