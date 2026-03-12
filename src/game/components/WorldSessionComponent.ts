import { Component } from "@claudiu-ceia/tick";

export class WorldSessionComponent extends Component {
  private elapsedSecondsValue = 0;

  public get elapsedSeconds(): number {
    return this.elapsedSecondsValue;
  }

  public set elapsedSeconds(value: number) {
    this.elapsedSecondsValue = Math.max(0, value);
  }
}
