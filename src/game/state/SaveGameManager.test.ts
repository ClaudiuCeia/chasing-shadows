import { describe, expect, test } from "bun:test";
import { SaveGameManager, type StorageLike } from "./SaveGameManager.ts";
import type { SaveGameV1 } from "./save-types.ts";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}

const snapshot: SaveGameV1 = {
  version: 1,
  seed: 77,
  elapsedSeconds: 13,
  terminatorTravelDistance: 21,
  hp: 96,
  player: { x: 1, y: 2, vx: 3, vy: 4 },
  needs: { hunger: 1, thirst: 2, sickness: 3, heat: 4, cold: 5 },
  mapDeltas: [{ x: 1, y: -2, kind: "shelter" }],
};

describe("SaveGameManager", () => {
  test("saves and loads autosave payload", () => {
    const manager = new SaveGameManager(new MemoryStorage());
    manager.saveAutosave(snapshot);

    expect(manager.loadAutosave()).toEqual(snapshot);
  });

  test("returns null for invalid payloads", () => {
    const storage = new MemoryStorage();
    storage.setItem("mercury.autosave.v1", "{bad json");

    const manager = new SaveGameManager(storage);
    expect(manager.loadAutosave()).toBeNull();
  });

  test("clears autosave", () => {
    const manager = new SaveGameManager(new MemoryStorage());
    manager.saveAutosave(snapshot);
    manager.clearAutosave();

    expect(manager.loadAutosave()).toBeNull();
  });
});
