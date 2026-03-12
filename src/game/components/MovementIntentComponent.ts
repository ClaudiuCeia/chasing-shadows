import { Component } from "@claudiu-ceia/tick";

export class MovementIntentComponent extends Component {
  public strafe = 0;
  public forward = 0;
  public walk = false;
  public crouch = false;

  public setIntent(strafe: number, forward: number, walk: boolean, crouch: boolean): void {
    this.strafe = strafe;
    this.forward = forward;
    this.walk = walk;
    this.crouch = crouch;
  }
}
