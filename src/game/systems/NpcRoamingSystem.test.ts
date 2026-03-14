import { beforeEach, describe, expect, test } from "bun:test";
import { EcsRuntime, Vector2D } from "@claudiu-ceia/tick";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { NpcEntity } from "../entities/NpcEntity.ts";
import { NpcRoamingSystem } from "./NpcRoamingSystem.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

describe("NpcRoamingSystem", () => {
  test("retargets every five seconds and keeps NPCs walking", () => {
    const runtime = new EcsRuntime();

    EcsRuntime.runWith(runtime, () => {
      const npc = new NpcEntity(new Vector2D(4, 6), 101);
      npc.awake();

      const system = new NpcRoamingSystem(runtime);
      system.awake();
      system.update(1);

      const initialRotation = npc.transform.transform.rotation;
      const intent = npc.getComponent(MovementIntentComponent);
      expect(Math.hypot(intent.strafe, intent.forward)).toBeCloseTo(1, 5);
      expect(intent.walk).toBe(true);

      for (let i = 0; i < 5; i++) {
        system.update(1);
      }

      expect(npc.transform.transform.rotation).not.toBe(initialRotation);
      expect(Math.hypot(intent.strafe, intent.forward)).toBeCloseTo(1, 5);
      expect(intent.walk).toBe(true);
    });
  });
});
