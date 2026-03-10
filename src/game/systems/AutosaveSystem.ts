import { SystemPhase, SystemTickMode, type System } from "@claudiu-ceia/tick";

export type AutosaveSystemOptions = {
  intervalSeconds: number;
  save: () => void;
};

export class AutosaveSystem implements System {
  public readonly phase = SystemPhase.Render;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly intervalSeconds: number;
  private readonly save: () => void;
  private elapsed = 0;

  public constructor(options: AutosaveSystemOptions) {
    this.intervalSeconds = Math.max(0.1, options.intervalSeconds);
    this.save = options.save;
  }

  public update(deltaTime: number): void {
    this.elapsed += Math.max(0, deltaTime);
    if (this.elapsed < this.intervalSeconds) return;

    this.elapsed = 0;
    this.save();
  }
}
