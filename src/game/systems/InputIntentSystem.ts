import {
  ACTIVE_HOTBAR_SLOT_VALUES,
  type ActiveHotbarSlot,
  InventoryComponent,
} from "../components/InventoryComponent.ts";
import {
  EcsRuntime,
  SystemPhase,
  SystemTickMode,
  TransformComponent,
  Vector2D,
  type EntityQuery,
  type System,
} from "@claudiu-ceia/tick";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { ModalStateComponent } from "../components/ModalStateComponent.ts";
import { PlayerTagComponent } from "../components/PlayerTagComponent.ts";
import { getSingletonComponent } from "../ecs/singleton.ts";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";
import { PlayerAttackSystem } from "./PlayerAttackSystem.ts";
import { clientToCanvas } from "../../shared/canvas-utils.ts";

type IntentEntity = {
  getComponent(constr: typeof PlayerAttackComponent): PlayerAttackComponent;
  getComponent(constr: typeof InventoryComponent): InventoryComponent;
  getComponent(constr: typeof MovementIntentComponent): MovementIntentComponent;
  getComponent(constr: typeof TransformComponent): TransformComponent;
};

const HOTBAR_KEY_BINDINGS: ReadonlyArray<readonly [string, ActiveHotbarSlot]> = [
  ["1", ACTIVE_HOTBAR_SLOT_VALUES[0]],
  ["2", ACTIVE_HOTBAR_SLOT_VALUES[1]],
  ["3", ACTIVE_HOTBAR_SLOT_VALUES[2]],
  ["4", ACTIVE_HOTBAR_SLOT_VALUES[3]],
] as const;

export class InputIntentSystem implements System {
  public readonly phase = SystemPhase.Input;
  public readonly tickMode = SystemTickMode.Frame;

  private readonly runtime: EcsRuntime;
  private query: EntityQuery | null = null;
  private uiQuery: EntityQuery | null = null;
  private walkToggled = false;
  private crouchToggled = false;

  public constructor(
    private readonly camera: IsometricCameraEntity,
    private readonly canvas: HTMLCanvasElement,
    runtime: EcsRuntime = EcsRuntime.getCurrent(),
  ) {
    this.runtime = runtime;
  }

  public awake(): void {
    this.query = this.runtime.registry
      .query()
      .with(PlayerTagComponent)
      .with(PlayerAttackComponent)
      .with(InventoryComponent)
      .with(MovementIntentComponent)
      .with(TransformComponent);
    this.uiQuery = this.runtime.registry.query().with(ModalStateComponent);
  }

  public update(): void {
    if (!this.query) return;

    const modalState = this.uiQuery
      ? getSingletonComponent(this.uiQuery, ModalStateComponent)
      : null;
    const modalOpen = modalState?.isOpen() ?? false;

    const left = this.runtime.input.isDown("a") || this.runtime.input.isDown("ArrowLeft");
    const right = this.runtime.input.isDown("d") || this.runtime.input.isDown("ArrowRight");
    const up = this.runtime.input.isDown("w") || this.runtime.input.isDown("ArrowUp");
    const down = this.runtime.input.isDown("s") || this.runtime.input.isDown("ArrowDown");

    if (!modalOpen && this.runtime.input.isPressed("Shift")) {
      this.walkToggled = !this.walkToggled;
    }

    if (!modalOpen && (this.runtime.input.isPressed("c") || this.runtime.input.isPressed("C"))) {
      this.crouchToggled = !this.crouchToggled;
    }

    const selectedHotbarSlot = modalOpen ? null : this.getPressedHotbarSlot();

    const strafe = modalOpen ? 0 : (right ? 1 : 0) - (left ? 1 : 0);
    const forward = modalOpen ? 0 : (up ? 1 : 0) - (down ? 1 : 0);

    const mouse = this.runtime.input.getMousePos();
    const canvasPoint = clientToCanvas(mouse, this.canvas);
    const worldPoint = this.camera.canvasToWorld(
      canvasPoint,
      new Vector2D(this.canvas.width, this.canvas.height),
    );

    for (const entity of this.query.run() as IntentEntity[]) {
      const attack = entity.getComponent(PlayerAttackComponent);
      const inventory = entity.getComponent(InventoryComponent);
      const intent = entity.getComponent(MovementIntentComponent);
      const transform = entity.getComponent(TransformComponent);
      if (selectedHotbarSlot && inventory.getActiveSlot() !== selectedHotbarSlot) {
        inventory.setActiveSlot(selectedHotbarSlot);
        PlayerAttackSystem.syncFireModeFromInventory(attack, inventory);
        PlayerAttackSystem.stopAttack(attack);
        attack.refireRemaining = 0;
        attack.releasedSinceLastShot = true;
      }
      intent.setIntent(strafe, forward, this.walkToggled, this.crouchToggled);

      const look = worldPoint.subtract(transform.transform.position);
      if (!modalOpen && look.magnitude > 0.0001) {
        transform.transform.rotation = Math.atan2(look.y, look.x);
      }
    }
  }

  private getPressedHotbarSlot(): ActiveHotbarSlot | null {
    for (const [key, slot] of HOTBAR_KEY_BINDINGS) {
      if (this.runtime.input.isPressed(key)) {
        return slot;
      }
    }

    return null;
  }
}
