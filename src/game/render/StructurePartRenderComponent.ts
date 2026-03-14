import { Vector2D } from "@claudiu-ceia/tick";
import { IsometricRenderableComponent } from "../components/IsometricRenderableComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import type { StructureWallSide } from "../structures/structure-types.ts";

type ScreenPoint = {
  x: number;
  y: number;
};

export const STRUCTURE_LEVEL_HEIGHT_PX = 64;
export const STRUCTURE_WALL_LEVELS = 4;
export const STRUCTURE_DOOR_LEVELS = 2;
export const STRUCTURE_WINDOW_BASE_LEVEL = 1;
export const STRUCTURE_WINDOW_LEVELS = 1;
export const STRUCTURE_LEVEL_HEIGHT_WORLD = STRUCTURE_LEVEL_HEIGHT_PX / GAME_CONFIG.elevationStepPixels;
export const STRUCTURE_WALL_HEIGHT_WORLD = STRUCTURE_WALL_LEVELS * STRUCTURE_LEVEL_HEIGHT_WORLD;
export const STRUCTURE_ROOF_THICKNESS_WORLD = 0.35;

const HALF_TILE_WIDTH = GAME_CONFIG.tileWidth / 2;
const HALF_TILE_HEIGHT = GAME_CONFIG.tileHeight / 2;

const projectOffset = (screen: Vector2D, dx: number, dy: number, heightPx: number): ScreenPoint => ({
  x: Math.floor(screen.x + (dx - dy) * HALF_TILE_WIDTH),
  y: Math.floor(screen.y + (dx + dy) * HALF_TILE_HEIGHT - heightPx),
});

const fillPolygon = (
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  fillStyle: string,
  strokeStyle: string,
  opacity = 1,
): void => {
  if (points.length === 0 || opacity <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
};

export class StructureFloorRenderComponent extends IsometricRenderableComponent {
  public constructor(
    private readonly fill = "#6b5f4b",
    private readonly stroke = "rgba(34, 24, 12, 0.8)",
  ) {
    super();
    this.sortOffset = -0.45;
  }

  public override renderIsometric(ctx: CanvasRenderingContext2D, screen: Vector2D): void {
    fillPolygon(
      ctx,
      [
        projectOffset(screen, -0.5, -0.5, 0),
        projectOffset(screen, 0.5, -0.5, 0),
        projectOffset(screen, 0.5, 0.5, 0),
        projectOffset(screen, -0.5, 0.5, 0),
      ],
      this.fill,
      this.stroke,
    );
  }
}

export class StructureRoofRenderComponent extends IsometricRenderableComponent {
  private opacity = 1;

  public constructor(
    private readonly roofHeightPx = STRUCTURE_WALL_LEVELS * STRUCTURE_LEVEL_HEIGHT_PX,
    private readonly fill = "#b5a07d",
    private readonly stroke = "rgba(72, 49, 19, 0.95)",
  ) {
    super();
    this.sortOffset = 1.2;
  }

  public setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }

  public override renderIsometric(ctx: CanvasRenderingContext2D, screen: Vector2D): void {
    fillPolygon(
      ctx,
      [
        projectOffset(screen, -0.5, -0.5, this.roofHeightPx),
        projectOffset(screen, 0.5, -0.5, this.roofHeightPx),
        projectOffset(screen, 0.5, 0.5, this.roofHeightPx),
        projectOffset(screen, -0.5, 0.5, this.roofHeightPx),
      ],
      this.fill,
      this.stroke,
      this.opacity,
    );
  }
}

const getWallQuad = (
  screen: Vector2D,
  side: StructureWallSide,
  bottomOffset: number,
  height: number,
): ScreenPoint[] => {
  const bottomPx = bottomOffset * STRUCTURE_LEVEL_HEIGHT_PX;
  const topPx = (bottomOffset + height) * STRUCTURE_LEVEL_HEIGHT_PX;

  switch (side) {
    case "north":
      return [
        projectOffset(screen, -0.5, 0, bottomPx),
        projectOffset(screen, 0.5, 0, bottomPx),
        projectOffset(screen, 0.5, 0, topPx),
        projectOffset(screen, -0.5, 0, topPx),
      ];
    case "east":
      return [
        projectOffset(screen, 0, -0.5, bottomPx),
        projectOffset(screen, 0, 0.5, bottomPx),
        projectOffset(screen, 0, 0.5, topPx),
        projectOffset(screen, 0, -0.5, topPx),
      ];
    case "south":
      return [
        projectOffset(screen, -0.5, 0, bottomPx),
        projectOffset(screen, 0.5, 0, bottomPx),
        projectOffset(screen, 0.5, 0, topPx),
        projectOffset(screen, -0.5, 0, topPx),
      ];
    case "west":
      return [
        projectOffset(screen, 0, -0.5, bottomPx),
        projectOffset(screen, 0, 0.5, bottomPx),
        projectOffset(screen, 0, 0.5, topPx),
        projectOffset(screen, 0, -0.5, topPx),
      ];
  }
};

const wallFillBySide: Record<StructureWallSide, string> = {
  north: "#8c7658",
  east: "#7a664d",
  south: "#6d5a44",
  west: "#827058",
};

const wallDepthBiasBySide: Record<StructureWallSide, number> = {
  north: -0.45,
  east: 0.45,
  south: 0.45,
  west: -0.45,
};

export class StructureWallRenderComponent extends IsometricRenderableComponent {
  public constructor(
    private readonly side: StructureWallSide,
    private readonly bottomOffset: number,
    private readonly height: number,
    private readonly fill = wallFillBySide[side],
    private readonly stroke = "rgba(39, 24, 11, 0.85)",
  ) {
    super();
    this.sortOffset = 0.15 + bottomOffset * 0.05 + wallDepthBiasBySide[side];
  }

  public override renderIsometric(ctx: CanvasRenderingContext2D, screen: Vector2D): void {
    fillPolygon(ctx, getWallQuad(screen, this.side, this.bottomOffset, this.height), this.fill, this.stroke);
  }
}
