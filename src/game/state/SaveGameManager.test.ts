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

const autosave: SaveGameV1 = {
  version: 1,
  world: {
    seed: 42,
    chunkSize: 16,
    lootSpawnChance: 0.0025,
    elapsedSeconds: 12.5,
    terminator: {
      safeBandHalfWidth: 6,
      travelSpeed: 0.4,
      travelDistance: 3.25,
      direction: { x: 0.5, y: -0.5 },
    },
    tileDeltas: [
      { x: 1, y: 2, kind: "scrap", elevation: 2, occluder: true, corners: { northWest: 2 } },
    ],
    lootDeltas: [
      {
        x: 3,
        y: 4,
        slots: [
          { itemId: "wire", count: 2 },
          ...Array.from({ length: 15 }, () => null),
        ],
      },
      { x: -1, y: 0, removed: true },
    ],
  },
  player: {
    position: { x: 3, y: -2 },
    rotation: 1.5,
    velocity: { x: 0.25, y: -0.75 },
    health: 87,
    needs: {
      hunger: 71,
      thirst: 62,
      sickness: 5,
    },
    temperature: {
      thermalBalance: -12,
      heat: 0,
      cold: 18,
    },
    inventory: [
      { itemId: "wire", count: 3 },
      null,
      { itemId: "water", count: 1 },
      null,
      null,
      null,
      null,
      null,
    ],
    fireMode: "semi",
  },
};

describe("SaveGameManager", () => {
  test("saves and loads autosave payload", () => {
    const manager = new SaveGameManager(new MemoryStorage());
    manager.saveAutosave(autosave);

    expect(manager.loadAutosave()).toEqual(autosave);
  });

  test("returns null for invalid payloads", () => {
    const storage = new MemoryStorage();
    storage.setItem("chasing-shadow.autosave.v1", "{bad json");

    const manager = new SaveGameManager(storage);
    expect(manager.loadAutosave()).toBeNull();
  });

  test("returns null for legacy snapshot payloads", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "chasing-shadow.autosave.v1",
      JSON.stringify({
        version: 1,
        ecsSnapshot: {
          version: 1,
          rootSid: "world",
          entities: [],
          atoms: {},
        },
      }),
    );

    const manager = new SaveGameManager(storage);
    expect(manager.loadAutosave()).toBeNull();
  });

  test("returns null for payloads that violate domain constraints", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "chasing-shadow.autosave.v1",
      JSON.stringify({
        ...autosave,
        world: {
          ...autosave.world,
          chunkSize: 0,
        },
      }),
    );

    const manager = new SaveGameManager(storage);
    expect(manager.loadAutosave()).toBeNull();
  });

  test("clears autosave", () => {
    const manager = new SaveGameManager(new MemoryStorage());
    manager.saveAutosave(autosave);
    manager.clearAutosave();

    expect(manager.loadAutosave()).toBeNull();
  });
});
