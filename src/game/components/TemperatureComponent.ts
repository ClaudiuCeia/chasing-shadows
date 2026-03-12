import { Component } from "@claudiu-ceia/tick";

export class TemperatureComponent extends Component {
  private thermalBalanceValue = 0;
  private heatValue = 0;
  private coldValue = 0;

  public get thermalBalance(): number {
    return this.thermalBalanceValue;
  }

  public set thermalBalance(value: number) {
    this.thermalBalanceValue = value;
  }

  public get heat(): number {
    return this.heatValue;
  }

  public set heat(value: number) {
    this.heatValue = value;
  }

  public get cold(): number {
    return this.coldValue;
  }

  public set cold(value: number) {
    this.coldValue = value;
  }
}
