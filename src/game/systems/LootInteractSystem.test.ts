import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { PlayerEntity } from "../entities/PlayerEntity.ts";
import { LootUiState } from "../state/LootUiState.ts";
import { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { LOOT_BOX_SLOT_COUNT, LootBoxField } from "../world/LootBoxField.ts";
import { LootInteractSystem } from "./LootInteractSystem.ts";

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
      const index = list.indexOf(fn as (event: any) => void);
      if (index >= 0) {
        list.splice(index, 1);
      }
    },
  }) as unknown as EventTarget;

const emit = (handlers: HandlerMap, type: string, event: any): void => {
  for (const fn of handlers[type] ?? []) {
    fn(event);
  }
};

beforeEach(() => {
  EcsRuntime.reset();
});

describe("LootInteractSystem", () => {
  test("opens nearest loot box on E press when in range", () => {
    const runtime = new EcsRuntime();
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const lootField = new LootBoxField({ seed: 2 });
      lootField.setSlots(
        0,
        0,
        Array.from({ length: LOOT_BOX_SLOT_COUNT }, (_unused, index) =>
          index === 0 ? { itemId: "wire", count: 2 } : null,
        ),
      );

      const player = new PlayerEntity(new Vector2D(0.2, 0.1), 4);
      player.awake();
      const ui = new LootUiState();
      const system = new LootInteractSystem(map, lootField, player, ui, { interactRange: 1.3 }, runtime);

      emit(handlers, "keydown", { key: "e" });
      system.update();

      expect(ui.openBox).toEqual({ x: 0, y: 0 });
    });
  });

  test("does not open loot box when outside interaction range", () => {
    const runtime = new EcsRuntime();
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    EcsRuntime.runWith(runtime, () => {
      const map = new InfiniteTilemap({ seed: 1, chunkSize: 16 });
      const lootField = new LootBoxField({ seed: 2 });
      lootField.setSlots(
        0,
        0,
        Array.from({ length: LOOT_BOX_SLOT_COUNT }, (_unused, index) =>
          index === 0 ? { itemId: "wire", count: 2 } : null,
        ),
      );

      const player = new PlayerEntity(new Vector2D(4, 4), 4);
      player.awake();
      const ui = new LootUiState();
      const system = new LootInteractSystem(map, lootField, player, ui, { interactRange: 1.3 }, runtime);

      emit(handlers, "keydown", { key: "e" });
      system.update();

      expect(ui.openBox).toBeNull();
    });
  });
});
