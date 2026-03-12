import { describe, expect, test } from "bun:test";
import { Vector2D } from "@claudiu-ceia/tick";
import { TerminatorComponent } from "../components/TerminatorComponent.ts";
import { isoToWorld, worldToIso } from "../../shared/math/iso.ts";

describe("TerminatorComponent", () => {
  test("travels diagonally toward top-right", () => {
    const direction = isoToWorld(new Vector2D(1, -1), { tileWidth: 64, tileHeight: 32 }).normalize();
    const model = new TerminatorComponent({ safeBandHalfWidth: 2, travelSpeed: 10, direction });
    model.advance(1);

    const centerIso = worldToIso(new Vector2D(model.getCenterX(), model.getCenterY()), { tileWidth: 64, tileHeight: 32 });
    expect(centerIso.x).toBeGreaterThan(0);
    expect(centerIso.y).toBeLessThan(0);
  });

  test("reports side and distance to safe band", () => {
    const model = new TerminatorComponent({ safeBandHalfWidth: 1, travelSpeed: 0 });

    expect(model.getSide(new Vector2D(3, 0))).toBe("sun");
    expect(model.getSide(new Vector2D(0, 3))).toBe("dark");
    expect(model.distanceOutsideSafeBand(new Vector2D(0.2, -0.1))).toBe(0);
  });
});
