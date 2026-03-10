import { SystemPhase, SystemTickMode, type System } from "@claudiu-ceia/tick";
import type { TerminatorModel } from "../world/TerminatorModel.ts";

export class TerminatorSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Fixed;

  private elapsedSeconds = 0;

  public constructor(private readonly terminator: TerminatorModel) {}

  public update(deltaTime: number): void {
    this.elapsedSeconds += Math.max(0, deltaTime);
    this.terminator.update(deltaTime);
  }

  public getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  public setElapsedSeconds(value: number): void {
    this.elapsedSeconds = Math.max(0, value);
  }
}
