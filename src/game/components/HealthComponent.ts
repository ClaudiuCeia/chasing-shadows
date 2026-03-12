import { Component } from "@claudiu-ceia/tick";

export class HealthComponent extends Component {
  private hpValue = 100;

  public get hp(): number {
    return this.hpValue;
  }

  public set hp(value: number) {
    this.hpValue = value;
  }
}
