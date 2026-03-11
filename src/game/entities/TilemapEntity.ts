import { EcsRuntime, Entity } from "@claudiu-ceia/tick";
import type { TerminatorModel } from "../world/TerminatorModel.ts";
import type { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { createTileAtlas } from "../render/TileAtlas.ts";
import { TilemapRenderComponent, type TilemapRenderOptions } from "../render/TilemapRenderComponent.ts";

export type TilemapEntityOptions = {
  tileWidth: number;
  tileHeight: number;
  render?: TilemapRenderOptions;
  runtime?: EcsRuntime;
};

export class TilemapEntity extends Entity {
  public constructor(
    map: InfiniteTilemap,
    terminator: TerminatorModel,
    options: TilemapEntityOptions,
  ) {
    super();

    this.addComponent(
      new TilemapRenderComponent(
        map,
        terminator,
        createTileAtlas(options.tileWidth, options.tileHeight),
        options.tileWidth,
        options.tileHeight,
        options.render,
        options.runtime,
      ),
    );
  }

  public override update(_dt: number): void {}
}
