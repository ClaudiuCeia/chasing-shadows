import { Component } from "@claudiu-ceia/tick";

export class ObstacleComponent extends Component {
  public constructor(public readonly blocksMovement = true) {
    super();
  }
}
