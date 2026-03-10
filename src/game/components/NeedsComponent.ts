import { Component } from "@claudiu-ceia/tick";

export class NeedsComponent extends Component {
  public static type = "needs";

  public hunger = 100;
  public thirst = 100;
  public sickness = 0;
}
