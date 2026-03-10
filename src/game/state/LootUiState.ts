export type OpenLootBoxRef = {
  x: number;
  y: number;
};

export class LootUiState {
  public openBox: OpenLootBoxRef | null = null;
  public hoveredSlot: number | null = null;

  public open(x: number, y: number): void {
    this.openBox = { x: Math.floor(x), y: Math.floor(y) };
  }

  public close(): void {
    this.openBox = null;
    this.hoveredSlot = null;
  }

  public setHoveredSlot(slot: number | null): void {
    this.hoveredSlot = slot;
  }
}
