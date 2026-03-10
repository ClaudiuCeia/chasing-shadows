import { Component } from "@claudiu-ceia/tick";

export class TemperatureComponent extends Component {
  public static type = "temperature";

  public thermalBalance = 0;
  public heat = 0;
  public cold = 0;
}
