import {
  PhysicsBodyComponent,
  Vector2D,
} from "@claudiu-ceia/tick";
import { IsometricRenderableComponent } from "../components/IsometricRenderableComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { worldToIso } from "../../shared/math/iso.ts";
import { screenVectorToDirectionIndex } from "./player-sprite-math.ts";
import IdleSheet from "../../../assets/player/Idle.png";
import WalkSheet from "../../../assets/player/Walk.png";

type PlayerSheets = {
  idle: HTMLImageElement;
  walk: HTMLImageElement;
};

const FRAME_SIZE = 128;
const FRAME_COLS = 14;
const FRAME_ROWS = 8;
const FOOT_ANCHOR_Y = 88;
const SPRITE_SCALE = 3;

const WALK_FPS_MIN = 12;
const WALK_FPS_MAX = 24;
const IDLE_FPS = 6;
const MOVE_THRESHOLD = 0.06;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load sprite image: ${src}`));
    image.src = src;
  });

export class PlayerRenderComponent extends IsometricRenderableComponent {
  private static sheetsPromise: Promise<PlayerSheets> | null = null;

  private sheets: PlayerSheets | null = null;
  private frameIndex = 0;
  private frameClock = 0;
  private directionIndex = 0;
  private lastRenderTime = 0;
  private lastMode: "idle" | "walk" = "idle";

  public constructor() {
    super();

    if (typeof Image === "undefined") {
      return;
    }

    if (!PlayerRenderComponent.sheetsPromise) {
      PlayerRenderComponent.sheetsPromise = Promise.all([
        loadImage(IdleSheet),
        loadImage(WalkSheet),
      ]).then(([idle, walk]) => ({ idle, walk }));
    }

    PlayerRenderComponent.sheetsPromise
      .then((sheets) => {
        this.sheets = sheets;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  public override renderIsometric(
    ctx: CanvasRenderingContext2D,
    screen: Vector2D,
    _isSelected: boolean,
  ): void {
    if (!this.sheets) {
      return;
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (this.lastRenderTime <= 0) {
      this.lastRenderTime = now;
    }
    const deltaTime = Math.min(0.1, Math.max(0, (now - this.lastRenderTime) / 1000));
    this.lastRenderTime = now;

    const velocity = this.ent.getComponent(PhysicsBodyComponent).getVelocity();
    const speed = velocity.magnitude;
    const moving = speed > MOVE_THRESHOLD;
    const mode: "idle" | "walk" = moving ? "walk" : "idle";

    if (moving) {
      const isoVelocity = worldToIso(velocity, {
        tileWidth: GAME_CONFIG.tileWidth,
        tileHeight: GAME_CONFIG.tileHeight,
      });

      if (isoVelocity.magnitude > 0.001) {
        this.directionIndex = screenVectorToDirectionIndex(isoVelocity);
      }
    }

    if (mode !== this.lastMode) {
      this.lastMode = mode;
      this.frameClock = 0;
      this.frameIndex = 0;
    }

    const normalizedSpeed = clamp01(speed / (GAME_CONFIG.playerBaseSpeed * 1.45));
    const walkFps = WALK_FPS_MIN + (WALK_FPS_MAX - WALK_FPS_MIN) * normalizedSpeed;
    const fps = mode === "walk" ? walkFps : IDLE_FPS;
    this.frameClock += deltaTime;
    const frameDuration = 1 / fps;
    while (this.frameClock >= frameDuration) {
      this.frameClock -= frameDuration;
      this.frameIndex = (this.frameIndex + 1) % FRAME_COLS;
    }

    const sheet = moving ? this.sheets.walk : this.sheets.idle;

    const frameX = (this.frameIndex % FRAME_COLS) * FRAME_SIZE;
    const frameY = (this.directionIndex % FRAME_ROWS) * FRAME_SIZE;

    const drawWidth = Math.floor(FRAME_SIZE * SPRITE_SCALE);
    const drawHeight = Math.floor(FRAME_SIZE * SPRITE_SCALE);
    const drawX = Math.floor(screen.x - drawWidth / 2);
    const drawY = Math.floor(screen.y - FOOT_ANCHOR_Y * SPRITE_SCALE);

    ctx.drawImage(
      sheet,
      frameX,
      frameY,
      FRAME_SIZE,
      FRAME_SIZE,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );
  }
}
