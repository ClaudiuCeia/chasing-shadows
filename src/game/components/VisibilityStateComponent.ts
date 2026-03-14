import { Component } from "@claudiu-ceia/tick";
import { tileKey } from "../../shared/math/tile-key.ts";

export type VisibilityTile = {
  x: number;
  y: number;
};

const cloneTile = (tile: VisibilityTile): VisibilityTile => ({ x: tile.x, y: tile.y });

export class VisibilityStateComponent extends Component {
  private visibleTiles = new Map<string, VisibilityTile>();
  private visibleStructureKeys = new Set<string>();
  private visibleStaticObjectIds = new Set<string>();
  private visibleStaticObjectTiles = new Map<string, VisibilityTile>();
  private rememberedTiles = new Map<string, VisibilityTile>();
  private rememberedStructureKeys = new Set<string>();

  public clear(): void {
    this.visibleTiles.clear();
    this.visibleStructureKeys.clear();
    this.visibleStaticObjectIds.clear();
    this.visibleStaticObjectTiles.clear();
    this.rememberedTiles.clear();
    this.rememberedStructureKeys.clear();
  }

  public setVisibleTiles(tiles: Iterable<VisibilityTile>): void {
    this.visibleTiles.clear();
    for (const tile of tiles) {
      this.visibleTiles.set(tileKey(tile.x, tile.y), cloneTile(tile));
    }
  }

  public setVisibleStructures(structureKeys: Iterable<string>): void {
    this.visibleStructureKeys = new Set(structureKeys);
  }

  public setVisibleStaticObjects(objectIds: Iterable<string>, occupiedTiles: Iterable<VisibilityTile>): void {
    this.visibleStaticObjectIds = new Set(objectIds);
    this.visibleStaticObjectTiles.clear();
    for (const tile of occupiedTiles) {
      this.visibleStaticObjectTiles.set(tileKey(tile.x, tile.y), cloneTile(tile));
    }
  }

  public rememberTiles(tiles: Iterable<VisibilityTile>): void {
    for (const tile of tiles) {
      this.rememberedTiles.set(tileKey(tile.x, tile.y), cloneTile(tile));
    }
  }

  public setRememberedStructures(structureKeys: Iterable<string>): void {
    this.rememberedStructureKeys = new Set(structureKeys);
  }

  public getVisibleTiles(): readonly VisibilityTile[] {
    return Array.from(this.visibleTiles.values(), cloneTile);
  }

  public getRememberedTiles(): readonly VisibilityTile[] {
    return Array.from(this.rememberedTiles.values(), cloneTile);
  }

  public getVisibleStructureKeys(): readonly string[] {
    return Array.from(this.visibleStructureKeys.values());
  }

  public getRememberedStructureKeys(): readonly string[] {
    return Array.from(this.rememberedStructureKeys.values());
  }

  public getVisibleStaticObjectIds(): readonly string[] {
    return Array.from(this.visibleStaticObjectIds.values());
  }

  public getVisibleStaticObjectTiles(): readonly VisibilityTile[] {
    return Array.from(this.visibleStaticObjectTiles.values(), cloneTile);
  }

  public isTileVisible(x: number, y: number): boolean {
    return this.visibleTiles.has(tileKey(x, y));
  }

  public isTileRemembered(x: number, y: number): boolean {
    return this.rememberedTiles.has(tileKey(x, y));
  }

  public isStructureVisible(key: string): boolean {
    return this.visibleStructureKeys.has(key);
  }

  public isStructureRemembered(key: string): boolean {
    return this.rememberedStructureKeys.has(key);
  }

  public isStaticObjectVisible(id: string): boolean {
    return this.visibleStaticObjectIds.has(id);
  }
}