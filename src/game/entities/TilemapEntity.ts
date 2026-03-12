import { EcsRuntime, Entity } from "@claudiu-ceia/tick";
import { TilemapStateComponent } from "../components/TilemapStateComponent.ts";
import type { TerminatorComponent } from "../components/TerminatorComponent.ts";
import type { InfiniteTilemapOptions } from "../world/InfiniteTilemap.ts";
import { createTileAtlas } from "../render/TileAtlas.ts";
import { TilemapRenderComponent, type TilemapRenderOptions } from "../render/TilemapRenderComponent.ts";

export type TilemapEntityOptions = {
  tileWidth: number;
  tileHeight: number;
  render?: TilemapRenderOptions;
  runtime?: EcsRuntime;
};

export class TilemapEntity extends Entity {
  public readonly tilemap: TilemapStateComponent;

  public constructor(
    state: InfiniteTilemapOptions,
  ) {
    super();
    this.tilemap = new TilemapStateComponent(state);
    this.addComponent(this.tilemap);
  }

  public configureRender(terminator: TerminatorComponent, options: TilemapEntityOptions): void {
    this.addComponent(
      new TilemapRenderComponent(
        this.tilemap,
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
