import { Component } from "@claudiu-ceia/tick";
import type { ItemStack } from "../items/item-catalog.ts";
import { normalizeItemSlots } from "../items/item-stack.ts";

export class LootContainerComponent extends Component {
  private slots: Array<ItemStack | null>;

  public constructor(
    public title: string,
    public readonly capacity: number,
    initialSlots: readonly (ItemStack | null)[] = [],
  ) {
    super();
    this.slots = normalizeItemSlots(initialSlots, capacity);
  }

  public getSlots(): readonly (ItemStack | null)[] {
    return this.slots;
  }

  public setSlots(slots: readonly (ItemStack | null)[]): void {
    this.slots = normalizeItemSlots(slots, this.capacity);
  }
}
