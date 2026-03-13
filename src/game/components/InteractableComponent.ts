import { Component } from "@claudiu-ceia/tick";

export type InteractableKind = "loot";

export class InteractableComponent extends Component {
  public enabled = true;

  public constructor(
    public readonly kind: InteractableKind,
    public range: number,
  ) {
    super();
  }
}
