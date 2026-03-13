import {
  EcsRuntime,
  EntityProfiler,
  HudViewport,
  RenderSystem,
  SceneManager,
  Vector2D,
} from "@claudiu-ceia/tick";
import { createGameplaySession, type GameplaySession } from "./gameplay/createGameplaySession.ts";
import { GameplayScene } from "./scenes/GameplayScene.ts";
import { TitleScene } from "./scenes/TitleScene.ts";
import { GAME_CONFIG } from "../game/config/game-config.ts";
import { HudOnlyCamera } from "../game/entities/HudOnlyCamera.ts";
import { SaveGameManager } from "../game/state/SaveGameManager.ts";
import { randomSeed } from "../shared/math/hash.ts";

const createCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.display = "block";
  canvas.style.background = "#130f0d";
  return canvas;
};

const resizeCanvas = (canvas: HTMLCanvasElement): Vector2D => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  return new Vector2D(canvas.width, canvas.height);
};

export const bootstrapGame = (): void => {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  const canvas = createCanvas();
  document.body.appendChild(canvas);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to acquire 2D rendering context");
  }

  context.imageSmoothingEnabled = false;

  const canvasState = {
    context,
    size: resizeCanvas(canvas),
  };

  const saveManager = new SaveGameManager();
  const autosave = saveManager.loadAutosave();
  const seed = randomSeed();

  let allowAutosave = true;
  let fps = 0;
  let frameTimeMs = 0;
  let fpsFrames = 0;
  let fpsAccumulator = 0;

  let session!: GameplaySession;
  const saveNow = (): void => {
    if (!allowAutosave) {
      return;
    }

    saveManager.saveAutosave(session.createAutosaveData());
  };

  session = createGameplaySession({
    canvas,
    canvasState,
    autosave,
    seed,
    getFps: () => ({ fps, frameTimeMs }),
    onAutosave: saveNow,
  });

  const onBeforeUnload = (): void => {
    saveNow();
  };

  const hudViewport = new HudViewport(
    new Vector2D(GAME_CONFIG.hudReferenceWidth, GAME_CONFIG.hudReferenceHeight),
    "contain",
    true,
  );
  const titleRuntime = new EcsRuntime();
  const titleCamera = new HudOnlyCamera();
  const titleRenderSystem = new RenderSystem(canvasState, titleCamera, titleRuntime, hudViewport);
  const sceneManager = new SceneManager();

  let pendingScene: "title" | "gameplay" | null = null;

  const restartGame = (): void => {
    allowAutosave = false;
    saveManager.clearAutosave();
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.location.reload();
  };

  const clearSceneInput = (): void => {
    session.runtime.input.clearFrame();
    titleRuntime.input.clearFrame();
  };

  const requestGameplayScene = (): void => {
    pendingScene = "gameplay";
  };

  const requestTitleScene = (): void => {
    pendingScene = "title";
  };

  const flushSceneChange = (): void => {
    if (!pendingScene) {
      return;
    }

    const nextScene = pendingScene;
    pendingScene = null;
    clearSceneInput();

    sceneManager.changeScene(
      nextScene === "gameplay"
        ? new GameplayScene({
            runtime: session.runtime,
            world: session.world,
            lootUi: session.lootUi,
            modalState: session.modalState,
            onOpenTitle: requestTitleScene,
            renderFrame: () => {
              context.imageSmoothingEnabled = false;
              context.setTransform(1, 0, 0, 1, 0, 0);
              context.fillStyle = "#18110d";
              context.fillRect(0, 0, canvas.width, canvas.height);
              session.renderSystem.render();
            },
          })
        : new TitleScene({
            runtime: titleRuntime,
            renderSystem: titleRenderSystem,
            onContinue: requestGameplayScene,
            onRestart: restartGame,
          }),
    );
  };

  const globalWindow = window as Window & typeof globalThis & {
    __tickProfiler?: {
      clear: () => void;
      start: () => void;
      stop: () => void;
      report: (topN?: number) => void;
      scanOffscreenColliders: () => void;
    };
  };

  globalWindow.__tickProfiler = {
    clear: () => EntityProfiler.clear(),
    start: () => {
      EntityProfiler.clear();
      EntityProfiler.start();
    },
    stop: () => EntityProfiler.stop(),
    report: (topN = 12) => {
      EntityProfiler.printTopSlow("update", topN);
      EntityProfiler.printTopSlow("render", topN);
    },
    scanOffscreenColliders: () => {
      EcsRuntime.runWith(session.runtime, () => {
        EntityProfiler.scanOffscreenCollision(session.camera);
      });
    },
  };

  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("resize", () => {
    canvasState.size = resizeCanvas(canvas);
  });

  requestTitleScene();

  let lastTime = performance.now();
  const frame = (now: number): void => {
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    frameTimeMs = deltaTime * 1000;
    fpsFrames += 1;
    fpsAccumulator += deltaTime;
    if (fpsAccumulator >= 0.25) {
      fps = Math.round(fpsFrames / fpsAccumulator);
      fpsFrames = 0;
      fpsAccumulator = 0;
    }

    flushSceneChange();
    sceneManager.update(deltaTime);
    sceneManager.render(context);
    session.runtime.input.clearFrame();
    titleRuntime.input.clearFrame();

    window.requestAnimationFrame(frame);
  };

  window.requestAnimationFrame(frame);
};
