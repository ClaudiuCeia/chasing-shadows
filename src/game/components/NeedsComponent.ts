import { Component } from "@claudiu-ceia/tick";

export class NeedsComponent extends Component {
  private hungerValue = 100;
  private thirstValue = 100;
  private sicknessValue = 0;

  public get hunger(): number {
    return this.hungerValue;
  }

  public set hunger(value: number) {
    this.hungerValue = value;
  }

  public get thirst(): number {
    return this.thirstValue;
  }

  public set thirst(value: number) {
    this.thirstValue = value;
  }

  public get sickness(): number {
    return this.sicknessValue;
  }

  public set sickness(value: number) {
    this.sicknessValue = value;
  }
}
