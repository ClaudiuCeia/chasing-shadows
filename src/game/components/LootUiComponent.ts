import { Component } from "@claudiu-ceia/tick";
import { createTileBoxLootSource, type LootSourceRef } from "../loot/loot-sources.ts";

export class LootUiComponent extends Component {
  public openSource: LootSourceRef | null = null;
  public hoveredSlot: number | null = null;
  public pendingSlotClick: number | null = null;

  public isOpen(): boolean {
    return this.openSource !== null;
  }

  public open(source: LootSourceRef): void {
    this.openSource = source;
  }

  public openTileBox(x: number, y: number): void {
    this.open(createTileBoxLootSource(x, y));
  }

  public close(): void {
    this.openSource = null;
    this.hoveredSlot = null;
    this.pendingSlotClick = null;
  }
}
