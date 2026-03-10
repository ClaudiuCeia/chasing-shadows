import { describe, expect, test } from "bun:test";
import { World } from "@claudiu-ceia/tick";
import { AutosaveSystem } from "./AutosaveSystem.ts";

describe("AutosaveSystem", () => {
  test("calls save callback at configured interval", () => {
    const calls: number[] = [];
    const world = new World({ fixedDeltaTime: 1 / 60, maxFrameDelta: 2 });
    world.addSystem(
      new AutosaveSystem({
        intervalSeconds: 1,
        save: () => calls.push(1),
      }),
    );

    world.step(0.4);
    world.step(0.4);
    expect(calls).toHaveLength(0);

    world.step(0.3);
    expect(calls).toHaveLength(1);
  });
});
