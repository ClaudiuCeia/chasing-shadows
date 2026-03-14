import { Component } from "@claudiu-ceia/tick";

export type HighlightStyle = "loot-outline" | "target-outline";

export class HighlightComponent extends Component {
  public active = false;

  public constructor(public style: HighlightStyle) {
    super();
  }
}
