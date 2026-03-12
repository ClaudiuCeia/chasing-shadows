import { EcsRuntime, SystemPhase, SystemTickMode, type EntityQuery, type System } from "@claudiu-ceia/tick";
import { TerminatorComponent } from "../components/TerminatorComponent.ts";
import { WorldSessionComponent } from "../components/WorldSessionComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";

export class TerminatorSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;
  private sessionQuery: EntityQuery | null = null;

  public constructor(runtime: EcsRuntime = EcsRuntime.getCurrent()) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry.query().with(TerminatorComponent);
    this.sessionQuery = this.runtime.registry.query().with(WorldSessionComponent);
  }

  public update(deltaTime: number): void {
    const session = this.sessionQuery ? getSingletonComponent(this.sessionQuery, WorldSessionComponent) : null;
    if (session) {
      session.elapsedSeconds += Math.max(0, deltaTime);
    }

    const terminator = this.query ? getSingletonComponent(this.query, TerminatorComponent) : null;
    if (terminator) {
      terminator.advance(deltaTime);
    }
  }
}
