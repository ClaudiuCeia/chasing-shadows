import { SystemPhase, SystemTickMode, type System } from "@claudiu-ceia/tick";

type UpdatableEntity = {
  update(deltaTime: number): void;
};

export class RootEntityUpdateSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  public constructor(private readonly roots: readonly UpdatableEntity[]) {}

  public update(deltaTime: number): void {
    for (const root of this.roots) {
      root.update(deltaTime);
    }
  }
}
