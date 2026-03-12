import { Entity } from "@claudiu-ceia/tick";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { WorldSessionComponent } from "../components/WorldSessionComponent.ts";
import type { LootBoxFieldOptions } from "../world/LootBoxField.ts";

export class WorldStateEntity extends Entity {
  public readonly lootField: LootFieldComponent;
  public readonly session = new WorldSessionComponent();

  public constructor(lootFieldOptions: LootBoxFieldOptions) {
    super();
    this.lootField = new LootFieldComponent(lootFieldOptions);
    this.addComponent(this.lootField);
    this.addComponent(this.session);
  }

  public override update(_dt: number): void {}
}
