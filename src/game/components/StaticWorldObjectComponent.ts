import { Component } from "@claudiu-ceia/tick";

export type StaticWorldObjectKind = "loot-box" | "structure" | "feature" | "decoration" | "vehicle";

export class StaticWorldObjectComponent extends Component {
  public constructor(public readonly kind: StaticWorldObjectKind) {
    super();
  }
}