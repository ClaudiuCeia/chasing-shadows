import { describe, expect, test } from "bun:test";
import { InfiniteTilemap } from "./InfiniteTilemap.ts";
import { LOOT_BOX_SLOT_COUNT, LootBoxField } from "./LootBoxField.ts";
import { createTileCornerHeights, createTileData } from "./tile-types.ts";

const findAnyBox = (
  field: LootBoxField,
  map: InfiniteTilemap,
): { x: number; y: number } | null => {
  for (let y = -24; y <= 24; y++) {
    for (let x = -24; x <= 24; x++) {
      if (field.getBoxAt(x, y, map)) {
        return { x, y };
      }
    }
  }

  return null;
};

describe("LootBoxField", () => {
  test("generates deterministic loot for the same seed", () => {
    const map = new InfiniteTilemap({ seed: 44, chunkSize: 16 });
    const a = new LootBoxField({ seed: 999 });
    const b = new LootBoxField({ seed: 999 });

    const location = findAnyBox(a, map);
    expect(location).not.toBeNull();
    if (!location) {
      return;
    }

    expect(a.getBoxAt(location.x, location.y, map)).toEqual(b.getBoxAt(location.x, location.y, map));
  });

  test("serializes and restores slot edits via deltas", () => {
    const map = new InfiniteTilemap({ seed: 19, chunkSize: 16 });
    const original = new LootBoxField({ seed: 555 });
    const location = findAnyBox(original, map);
    expect(location).not.toBeNull();
    if (!location) {
      return;
    }

    const box = original.getBoxAt(location.x, location.y, map);
    expect(box).not.toBeNull();
    if (!box) {
      return;
    }

    const edited = [...box.slots];
    for (let i = 0; i < edited.length; i++) {
      const stack = edited[i];
      if (!stack) continue;
      edited[i] = { itemId: stack.itemId, count: Math.max(1, stack.count - 1) };
      break;
    }

    original.setSlots(location.x, location.y, edited);
    const deltas = original.serializeDeltas();
    expect(deltas.length).toBeGreaterThan(0);

    const restored = new LootBoxField({ seed: 555 });
    restored.applyDeltas(deltas);

    expect(restored.getBoxAt(location.x, location.y, map)).toEqual(
      original.getBoxAt(location.x, location.y, map),
    );
  });

  test("does not spawn loot boxes on sloped tiles", () => {
    const map = new InfiniteTilemap({ seed: 19, chunkSize: 16 });
    map.setTileData(0, 0, {
      ...createTileData("regolith"),
      corners: createTileCornerHeights({ northWest: 2, northEast: 3, southEast: 3, southWest: 2 }),
    });

    const field = new LootBoxField({ seed: 555, spawnChance: 1 });
    expect(field.getBoxAt(0, 0, map)).toBeNull();
  });

  test("drops deltas when slots match generated loot again", () => {
    const map = new InfiniteTilemap({ seed: 19, chunkSize: 16 });
    const field = new LootBoxField({ seed: 555 });
    const location = findAnyBox(field, map);
    expect(location).not.toBeNull();
    if (!location) {
      return;
    }

    const box = field.getBoxAt(location.x, location.y, map);
    expect(box).not.toBeNull();
    if (!box) {
      return;
    }

    field.setSlots(location.x, location.y, box.slots);
    expect(field.serializeDeltas(map)).toEqual([]);
  });

  test("keeps emptied generated loot boxes as empty slot overrides", () => {
    const map = new InfiniteTilemap({ seed: 19, chunkSize: 16 });
    const field = new LootBoxField({ seed: 555 });
    const location = findAnyBox(field, map);
    expect(location).not.toBeNull();
    if (!location) {
      return;
    }

    field.setSlots(location.x, location.y, []);

    const deltas = field.serializeDeltas(map);
    expect(deltas).toContainEqual({
      x: location.x,
      y: location.y,
      slots: Array.from({ length: LOOT_BOX_SLOT_COUNT }, () => null),
    });

    const restored = new LootBoxField({ seed: 555 });
    restored.applyDeltas(deltas);
    expect(restored.getBoxAt(location.x, location.y, map)?.slots.every((slot) => slot === null)).toBeTrue();
  });
});
