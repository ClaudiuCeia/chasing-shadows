import { Component } from "@claudiu-ceia/tick";

export class TilePositionComponent extends Component {
  public static type = "tile-position";

  public x: number;
  public y: number;
  public z: number;

  public constructor(x: number, y: number, z = 0) {
    super();
    this.x = x;
    this.y = y;
    this.z = z;
  }

  public set(x: number, y: number, z = this.z): void {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  public depth(): number {
    return this.x + this.y + this.z;
  }
}
