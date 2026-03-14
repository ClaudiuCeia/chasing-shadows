import { Component } from "@claudiu-ceia/tick";

export class TargetableComponent extends Component {
  public enabled = true;

  public constructor(public aimHeight: number) {
    super();
  }
}
