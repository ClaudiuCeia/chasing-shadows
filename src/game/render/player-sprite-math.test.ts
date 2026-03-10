import { describe, expect, test } from "bun:test";
import { Vector2D } from "@claudiu-ceia/tick";
import { screenVectorToDirectionIndex } from "./player-sprite-math.ts";

describe("screenVectorToDirectionIndex", () => {
  test("maps cardinal and diagonal vectors clockwise from right", () => {
    expect(screenVectorToDirectionIndex(new Vector2D(1, 0))).toBe(0);
    expect(screenVectorToDirectionIndex(new Vector2D(1, 1))).toBe(1);
    expect(screenVectorToDirectionIndex(new Vector2D(0, 1))).toBe(2);
    expect(screenVectorToDirectionIndex(new Vector2D(-1, 1))).toBe(3);
    expect(screenVectorToDirectionIndex(new Vector2D(-1, 0))).toBe(4);
    expect(screenVectorToDirectionIndex(new Vector2D(-1, -1))).toBe(5);
    expect(screenVectorToDirectionIndex(new Vector2D(0, -1))).toBe(6);
    expect(screenVectorToDirectionIndex(new Vector2D(1, -1))).toBe(7);
  });
});
