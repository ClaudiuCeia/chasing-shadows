import {
  EcsRuntime,
  PhysicsBodyComponent,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { isoToWorld, type IsoConfig } from "../../shared/math/iso.ts";

type ControlledEntity = {
  getComponent(constr: typeof MovementIntentComponent): MovementIntentComponent;
  getComponent(constr: typeof TopDownControllerComponent): TopDownControllerComponent;
  getComponent(constr: typeof PhysicsBodyComponent): PhysicsBodyComponent;
  getComponent(constr: typeof TransformComponent): TransformComponent;
};

export type TopDownControllerSystemOptions = {
  isoConfig: IsoConfig;
};

const clampMagnitude = (vector: Vector2D, maxMagnitude: number): Vector2D => {
  if (vector.magnitude <= maxMagnitude) {
    return vector;
  }

  return vector.normalize().multiply(maxMagnitude);
};

const STOP_SPEED_EPSILON = 0.04;

export class TopDownControllerSystem implements System {
  public readonly phase = SystemPhase.Simulation;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly runtime: EcsRuntime;
  private readonly isoConfig: IsoConfig;
  private query: EntityQuery | null = null;

  public constructor(
    options: TopDownControllerSystemOptions,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
    this.isoConfig = options.isoConfig;
  }

  public awake(): void {
    this.query = this.runtime.registry
      .query()
      .with(MovementIntentComponent)
      .with(TopDownControllerComponent)
      .with(PhysicsBodyComponent)
      .with(TransformComponent);
  }

  public update(deltaTime: number): void {
    if (!this.query) return;

    for (const entity of this.query.run() as ControlledEntity[]) {
      const intent = entity.getComponent(MovementIntentComponent);
      const controller = entity.getComponent(TopDownControllerComponent);
      const body = entity.getComponent(PhysicsBodyComponent);
      const transform = entity.getComponent(TransformComponent);

      const hasKeyboardIntent = intent.x !== 0 || intent.y !== 0;
      const screenIntent = new Vector2D(intent.x, intent.y);
      const worldFromScreen = isoToWorld(screenIntent, this.isoConfig);

      let movementIntent = Vector2D.zero;
      let sprint = false;

      if (hasKeyboardIntent) {
        movementIntent = worldFromScreen;
        sprint = intent.sprint;
      } else if (intent.targetX !== null && intent.targetY !== null) {
        movementIntent = new Vector2D(
          intent.targetX - transform.transform.position.x,
          intent.targetY - transform.transform.position.y,
        );

        if (movementIntent.magnitude <= 0.15) {
          intent.clearMoveTarget();
          movementIntent = Vector2D.zero;
        }
      }

      const hasIntent = movementIntent.magnitude > 0;
      const normalizedIntent = hasIntent ? movementIntent.normalize() : Vector2D.zero;

      const sprintMultiplier = sprint ? controller.config.sprintMultiplier : 1;
      const targetSpeed = controller.config.maxSpeed * sprintMultiplier;
      const targetVelocity = normalizedIntent.multiply(targetSpeed);
      const currentVelocity = body.getVelocity();

      if (!hasIntent) {
        const damping = Math.max(0, 1 - controller.config.damping * deltaTime);
        const nextVelocity = currentVelocity.multiply(damping);
        body.setVelocity(nextVelocity.magnitude <= STOP_SPEED_EPSILON ? Vector2D.zero : nextVelocity);
        continue;
      }

      const delta = targetVelocity.subtract(currentVelocity);
      const maxChange = controller.config.acceleration * deltaTime;
      const clampedDelta = clampMagnitude(delta, maxChange);
      body.setVelocity(currentVelocity.add(clampedDelta));
    }
  }
}
