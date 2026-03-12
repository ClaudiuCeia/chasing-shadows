import { Component } from "@claudiu-ceia/tick";
import type { ItemStack } from "../items/item-catalog.ts";
import { LootBoxField, type LootBoxDelta, type LootBoxFieldOptions, type LootBoxState } from "../world/LootBoxField.ts";
import type { InfiniteTilemap } from "../world/InfiniteTilemap.ts";

export type NearestLootBoxRef = { x: number; y: number; distance: number };

export class LootFieldComponent extends Component {
  private readonly options: LootBoxFieldOptions;
  private field: LootBoxField;

  public constructor(options: LootBoxFieldOptions) {
    super();
    this.options = options;
    this.field = new LootBoxField(options);
  }

  public applyDeltas(deltas: readonly LootBoxDelta[]): void {
    this.field.applyDeltas(deltas);
  }

  public serializeDeltas(map?: InfiniteTilemap): LootBoxDelta[] {
    return this.field.serializeDeltas(map);
  }

  public getSeed(): number {
    return this.options.seed;
  }

  public getSpawnChance(): number | undefined {
    return this.options.spawnChance;
  }

  public getBoxAt(x: number, y: number, map: InfiniteTilemap): LootBoxState | null {
    return this.field.getBoxAt(x, y, map);
  }

  public findNearestBox(x: number, y: number, range: number, map: InfiniteTilemap): NearestLootBoxRef | null {
    return this.field.findNearestBox(x, y, range, map);
  }

  public setSlots(x: number, y: number, slots: readonly (ItemStack | null)[]): void {
    this.field.setSlots(x, y, slots);
  }
}
