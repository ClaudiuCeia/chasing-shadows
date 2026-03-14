import type { ItemStack } from "../items/item-catalog.ts";
import { ITEM_DEFINITIONS } from "../items/item-catalog.ts";
import { areItemSlotArraysEqual, cloneItemStack, normalizeItemSlots } from "../items/item-stack.ts";
import { hash2 } from "../../shared/math/hash.ts";
import { InfiniteTilemap } from "./InfiniteTilemap.ts";
import { isTileFlat } from "./tile-types.ts";
import { tileKey } from "../../shared/math/tile-key.ts";

export const LOOT_BOX_SLOT_COUNT = 16;

export type LootBoxState = {
  x: number;
  y: number;
  spriteIndex: number;
  slots: readonly (ItemStack | null)[];
};

export type LootBoxDelta =
  | {
      x: number;
      y: number;
      removed: true;
    }
  | {
      x: number;
      y: number;
      slots: Array<ItemStack | null>;
    };

type LootBoxOverride =
  | {
      removed: true;
    }
  | {
      slots: Array<ItemStack | null>;
    };

export type LootBoxFieldOptions = {
  seed: number;
  spawnChance?: number;
};

const isRemovedOverride = (value: LootBoxOverride): value is { removed: true } =>
  "removed" in value;

const isRemovedDelta = (value: LootBoxDelta): value is { x: number; y: number; removed: true } =>
  "removed" in value && value.removed;

const SPAWN_SEED = 0x5d50a771;
const SPRITE_SEED = 0x31a42f27;
const STACK_COUNT_SEED = 0x9b06d4b7;
const ITEM_SEED = 0x109f3e35;
const ITEM_COUNT_SEED = 0x4f2bc7ad;
const BOX_VARIANT_COUNT = 13;

const hasAnyItems = (slots: readonly (ItemStack | null)[]): boolean =>
  slots.some((slot) => slot !== null && slot.count > 0);

export class LootBoxField {
  private readonly overrides = new Map<string, LootBoxOverride>();
  private readonly cache = new Map<string, LootBoxState | null>();
  private readonly seed: number;
  private readonly spawnChance: number;

  public constructor(options: LootBoxFieldOptions) {
    this.seed = options.seed;
    this.spawnChance = options.spawnChance ?? 0.045;
  }

  public getBoxAt(tileX: number, tileY: number, map: InfiniteTilemap): LootBoxState | null {
    const x = Math.floor(tileX);
    const y = Math.floor(tileY);
    const key = tileKey(x, y);

    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const base = this.createGeneratedBox(x, y, map);
    const override = this.overrides.get(key);
    const box = this.applyOverride(base, override, x, y, map);
    this.cache.set(key, box);
    return box;
  }

  public getSlots(
    tileX: number,
    tileY: number,
    map: InfiniteTilemap,
  ): readonly (ItemStack | null)[] | null {
    return this.getBoxAt(tileX, tileY, map)?.slots ?? null;
  }

  public setSlots(tileX: number, tileY: number, slots: readonly (ItemStack | null)[]): void {
    const x = Math.floor(tileX);
    const y = Math.floor(tileY);
    const key = tileKey(x, y);
    const normalized = normalizeItemSlots(slots, LOOT_BOX_SLOT_COUNT);

    this.overrides.set(key, { slots: normalized });
    this.cache.delete(key);
  }

  public findNearestBox(
    worldX: number,
    worldY: number,
    maxDistance: number,
    map: InfiniteTilemap,
  ): { x: number; y: number; distance: number } | null {
    const radius = Math.max(0, maxDistance);
    const minX = Math.floor(worldX - radius - 1);
    const maxX = Math.ceil(worldX + radius + 1);
    const minY = Math.floor(worldY - radius - 1);
    const maxY = Math.ceil(worldY + radius + 1);

    let best: { x: number; y: number; distance: number } | null = null;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const box = this.getBoxAt(x, y, map);
        if (!box) {
          continue;
        }

        const dx = x - worldX;
        const dy = y - worldY;
        const distance = Math.hypot(dx, dy);
        if (distance > radius) {
          continue;
        }

        if (!best || distance < best.distance) {
          best = { x, y, distance };
        }
      }
    }

    return best;
  }

  public serializeDeltas(map?: InfiniteTilemap): LootBoxDelta[] {
    const deltas: LootBoxDelta[] = [];
    const staleKeys: string[] = [];

    for (const [key, override] of this.overrides.entries()) {
      const [xRaw, yRaw] = key.split(":");
      const x = Number(xRaw);
      const y = Number(yRaw);

      if (map) {
        const base = this.createGeneratedBox(x, y, map);
        if (isRemovedOverride(override)) {
          if (!base) {
            staleKeys.push(key);
            continue;
          }
        } else if (
          base &&
          areItemSlotArraysEqual(override.slots, base.slots, LOOT_BOX_SLOT_COUNT)
        ) {
          staleKeys.push(key);
          continue;
        }
      }

      if (isRemovedOverride(override)) {
        deltas.push({ x, y, removed: true });
      } else {
        deltas.push({
          x,
          y,
          slots: normalizeItemSlots(override.slots, LOOT_BOX_SLOT_COUNT),
        });
      }
    }

    for (const key of staleKeys) {
      this.overrides.delete(key);
      this.cache.delete(key);
    }

    return deltas;
  }

  public applyDeltas(deltas: readonly LootBoxDelta[]): void {
    for (const delta of deltas) {
      const key = tileKey(Math.floor(delta.x), Math.floor(delta.y));

      if (isRemovedDelta(delta)) {
        this.overrides.set(key, { removed: true });
        this.cache.delete(key);
        continue;
      }

      this.overrides.set(key, { slots: normalizeItemSlots(delta.slots, LOOT_BOX_SLOT_COUNT) });
      this.cache.delete(key);
    }
  }

  private createGeneratedBox(x: number, y: number, map: InfiniteTilemap): LootBoxState | null {
    const tile = map.getTile(x, y);
    if (tile.blocking || !isTileFlat(tile)) {
      return null;
    }

    const spawnNoise = hash2(x, y, this.seed ^ SPAWN_SEED);
    if (spawnNoise >= this.spawnChance) {
      return null;
    }

    const spriteIndex = Math.floor(hash2(x, y, this.seed ^ SPRITE_SEED) * BOX_VARIANT_COUNT);
    const stackBudget = 1 + Math.floor(hash2(x, y, this.seed ^ STACK_COUNT_SEED) * 4);

    const merged = new Map<string, ItemStack>();
    const catalogSize = ITEM_DEFINITIONS.length;

    for (let i = 0; i < stackBudget; i++) {
      const itemNoise = hash2(x * 37 + i * 17, y * 53 - i * 11, this.seed ^ ITEM_SEED);
      const itemIndex = Math.floor(itemNoise * catalogSize) % catalogSize;
      const definition = ITEM_DEFINITIONS[itemIndex];
      if (!definition) {
        continue;
      }

      const countNoise = hash2(x * 71 + i * 19, y * 11 + i * 29, this.seed ^ ITEM_COUNT_SEED);
      const count = 1 + Math.floor(countNoise * 5);

      const existing = merged.get(definition.id);
      if (existing) {
        existing.count += count;
      } else {
        merged.set(definition.id, { itemId: definition.id, count });
      }
    }

    const slots = Array.from({ length: LOOT_BOX_SLOT_COUNT }, () => null as ItemStack | null);
    let slotIndex = 0;
    for (const stack of merged.values()) {
      if (slotIndex >= LOOT_BOX_SLOT_COUNT) {
        break;
      }
      slots[slotIndex] = cloneItemStack(stack);
      slotIndex += 1;
    }

    if (!hasAnyItems(slots)) {
      return null;
    }

    return {
      x,
      y,
      spriteIndex,
      slots,
    };
  }

  private applyOverride(
    base: LootBoxState | null,
    override: LootBoxOverride | undefined,
    x: number,
    y: number,
    map: InfiniteTilemap,
  ): LootBoxState | null {
    const tile = map.getTile(x, y);
    if (tile.blocking || !isTileFlat(tile)) {
      return null;
    }

    if (!override) {
      return base;
    }

    if (isRemovedOverride(override)) {
      return null;
    }

    const spriteIndex =
      base?.spriteIndex ?? Math.floor(hash2(x, y, this.seed ^ SPRITE_SEED) * BOX_VARIANT_COUNT);
    return {
      x,
      y,
      spriteIndex,
      slots: normalizeItemSlots(override.slots, LOOT_BOX_SLOT_COUNT),
    };
  }
}
