import { Entity } from "@claudiu-ceia/tick";
import { TerminatorComponent, type TerminatorComponentOptions } from "../components/TerminatorComponent.ts";

export class TerminatorEntity extends Entity {
  public readonly terminator: TerminatorComponent;

  public constructor(options: TerminatorComponentOptions) {
    super();
    this.terminator = new TerminatorComponent(options);
    this.addComponent(this.terminator);
  }

  public override update(dt: number): void {
    super.update(dt);
  }
}
