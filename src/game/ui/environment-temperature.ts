import { Vector2D } from "@claudiu-ceia/tick";
import type { TerminatorComponent, TerminatorSide } from "../components/TerminatorComponent.ts";
import { clamp01 } from "../../shared/math/clamp.ts";
import { lerp } from "../../shared/math/lerp.ts";

export type AmbientTemperature = {
  celsius: number;
  side: TerminatorSide;
};

const SUN_CORE_TEMPERATURE = 400;
const SUN_EDGE_TEMPERATURE = 32;
const DARK_EDGE_TEMPERATURE = -18;
const DARK_CORE_TEMPERATURE = -150;
const EXTREME_FALLOFF_DISTANCE = 18;

export const getAmbientTemperature = (
  terminator: TerminatorComponent,
  point: Vector2D,
): AmbientTemperature => {
  const signedDistance = terminator.signedDistance(point);
  const outsideBand = terminator.distanceOutsideSafeBand(point);
  const side = terminator.getSide(point);
  const extremeMix = clamp01(outsideBand / EXTREME_FALLOFF_DISTANCE);

  if (outsideBand > 0) {
    return {
      side,
      celsius:
        side === "sun"
          ? lerp(SUN_EDGE_TEMPERATURE, SUN_CORE_TEMPERATURE, extremeMix)
          : lerp(DARK_EDGE_TEMPERATURE, DARK_CORE_TEMPERATURE, extremeMix),
    };
  }

  const bandWidth = Math.max(0.001, terminator.safeBandHalfWidth * 2);
  const bandMix = clamp01((signedDistance + terminator.safeBandHalfWidth) / bandWidth);
  return {
    side,
    celsius: lerp(DARK_EDGE_TEMPERATURE, SUN_EDGE_TEMPERATURE, bandMix),
  };
};
