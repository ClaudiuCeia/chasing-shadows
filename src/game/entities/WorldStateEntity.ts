import { Entity } from "@claudiu-ceia/tick";
import { LootFieldComponent } from "../components/LootFieldComponent.ts";
import { StructureStateComponent } from "../components/StructureStateComponent.ts";
import { VisibilityStateComponent } from "../components/VisibilityStateComponent.ts";
import { WorldSessionComponent } from "../components/WorldSessionComponent.ts";
import type { LootBoxFieldOptions } from "../world/LootBoxField.ts";

export class WorldStateEntity extends Entity {
  public readonly lootField: LootFieldComponent;
  public readonly structures = new StructureStateComponent();
  public readonly visibility = new VisibilityStateComponent();
  public readonly session = new WorldSessionComponent();

  public constructor(lootFieldOptions: LootBoxFieldOptions) {
    super();
    this.lootField = new LootFieldComponent(lootFieldOptions);
    this.addComponent(this.lootField);
    this.addComponent(this.structures);
    this.addComponent(this.visibility);
    this.addComponent(this.session);
  }

  public override update(dt: number): void {
    super.update(dt);
  }
}
