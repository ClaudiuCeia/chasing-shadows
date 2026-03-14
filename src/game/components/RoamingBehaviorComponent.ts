import { Component } from "@claudiu-ceia/tick";
import { hash2 } from "../../shared/math/hash.ts";

export type RoamingBehaviorOptions = {
  anchorX: number;
  anchorY: number;
  intervalSeconds?: number;
  seed?: number;
};

const DEFAULT_INTERVAL_SECONDS = 5;
const ANGLE_SEED = 0x4d3c2b1a;

export class RoamingBehaviorComponent extends Component {
  public readonly intervalSeconds: number;
  public readonly anchorX: number;
  public readonly anchorY: number;
  public readonly seed: number;
  public elapsedSeconds = 0;
  public stepIndex = 0;
  public directionAngle = 0;

  public constructor(options: RoamingBehaviorOptions) {
    super();
    this.intervalSeconds = Math.max(0.1, options.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS);
    this.anchorX = Math.floor(options.anchorX);
    this.anchorY = Math.floor(options.anchorY);
    this.seed = options.seed ?? 0;
    this.directionAngle = this.getAngleForStep(0);
  }

  public advanceDirection(): void {
    this.stepIndex += 1;
    this.directionAngle = this.getAngleForStep(this.stepIndex);
  }

  private getAngleForStep(step: number): number {
    const noise = hash2(this.anchorX + step * 17, this.anchorY - step * 29, this.seed ^ ANGLE_SEED);
    return noise * Math.PI * 2;
  }
}
