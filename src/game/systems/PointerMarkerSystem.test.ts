import { beforeEach, describe, expect, test } from "bun:test";
import {
  EcsRuntime,
  Entity,
  HudInputComponent,
  type HudInputEvent,
  HudInputRouter,
  HudLayoutNodeComponent,
  Vector2D,
  resolveHudLayout,
} from "@claudiu-ceia/tick";
import { UiStateEntity } from "../entities/UiStateEntity.ts";
import { IsometricCameraEntity } from "../render/IsometricCameraEntity.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { PointerMarkerSystem } from "./PointerMarkerSystem.ts";

type HandlerMap = Record<string, Array<(event: any) => void>>;

const makeTarget = (handlers: HandlerMap): EventTarget =>
  ({
    addEventListener(type: string, fn: EventListenerOrEventListenerObject) {
      handlers[type] ??= [];
      handlers[type].push(fn as (event: any) => void);
    },
    removeEventListener(type: string, fn: EventListenerOrEventListenerObject) {
      const list = handlers[type];
      if (!list) return;
      const i = list.indexOf(fn as (event: any) => void);
      if (i !== -1) list.splice(i, 1);
    },
  }) as unknown as EventTarget;

const emit = (handlers: HandlerMap, type: string, event: any): void => {
  for (const fn of handlers[type] ?? []) {
    fn(event);
  }
};

class Node extends Entity {
  public override update(_dt: number): void {}
}

class StopperInput extends HudInputComponent<Node> {
  protected override onPointerDown(event: HudInputEvent): void {
    event.stopPropagation();
  }
}

beforeEach(() => {
  EcsRuntime.reset();
});

describe("PointerMarkerSystem", () => {
  test("blocks world pointer state when HUD captures pointer down", () => {
    const runtime = new EcsRuntime();
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const canvas = {
      width: 100,
      height: 100,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    } as unknown as HTMLCanvasElement;

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      uiState.awake();

      const camera = new IsometricCameraEntity({ tileWidth: 64, tileHeight: 32 });
      camera.awake();

      const hudNode = new Node();
      hudNode.addComponent(new HudLayoutNodeComponent({ width: 100, height: 100 }));
      hudNode.addComponent(new StopperInput());
      hudNode.awake();

      resolveHudLayout(runtime, { x: 0, y: 0, width: 100, height: 100 });

      const system = new PointerMarkerSystem(camera, canvas, map, 6, runtime);
      system.awake();

      emit(handlers, "mousemove", { clientX: 50, clientY: 50, buttons: 0 });
      emit(handlers, "mousedown", { button: 0 });
      HudInputRouter.routePointer(runtime, "pointerdown", new Vector2D(50, 50), new Vector2D(50, 50), {
        pointerType: "mouse",
      });

      system.update();
      expect(uiState.pointerWorld.worldPoint).toBeNull();
      expect(uiState.pointerWorld.blockedByHud).toBeTrue();
      expect(uiState.pointerWorld.mode).toBe("interaction");
    });
  });

  test("resolves world point and emits click phase on mouseup", () => {
    const runtime = new EcsRuntime();
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const canvas = {
      width: 100,
      height: 100,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    } as unknown as HTMLCanvasElement;

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const uiState = new UiStateEntity();
      uiState.awake();

      const camera = new IsometricCameraEntity({ tileWidth: 64, tileHeight: 32 });
      camera.awake();

      const system = new PointerMarkerSystem(camera, canvas, map, 6, runtime);
      system.awake();

      emit(handlers, "mousemove", { clientX: 50, clientY: 50, buttons: 0 });
      emit(handlers, "mousedown", { button: 0 });
      system.update();

      expect(uiState.pointerWorld.worldPoint).not.toBeNull();
      expect(uiState.pointerWorld.phase).toBe("press");

      emit(handlers, "mouseup", { button: 0 });
      system.update();
      expect(uiState.pointerWorld.phase).toBe("click");
    });
  });
});
