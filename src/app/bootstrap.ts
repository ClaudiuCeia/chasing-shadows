import {
  EcsRuntime,
  EntityProfiler,
  Entity,
  HudInputRouter,
  HudLayoutNodeComponent,
  HudViewport,
  PhysicsSystem,
  RenderSystem,
  Scene,
  SceneManager,
  TransformComponent,
  Vector2D,
  World,
} from "@claudiu-ceia/tick";
import { GAME_CONFIG } from "../game/config/game-config.ts";
import { PlayerEntity } from "../game/entities/PlayerEntity.ts";
import { RenderNodeEntity } from "../game/entities/RenderNodeEntity.ts";
import { IsometricCameraEntity } from "../game/render/IsometricCameraEntity.ts";
import { PlayerRenderComponent } from "../game/render/PlayerRenderComponent.ts";
import { createTileAtlas } from "../game/render/TileAtlas.ts";
import { TilemapRenderComponent } from "../game/render/TilemapRenderComponent.ts";
import { WorldMarkerRenderComponent } from "../game/render/WorldMarkerRenderComponent.ts";
import { InventoryState } from "../game/state/InventoryState.ts";
import { LootUiState } from "../game/state/LootUiState.ts";
import { MarkerState } from "../game/state/MarkerState.ts";
import { SaveGameManager } from "../game/state/SaveGameManager.ts";
import type { SaveGameV1 } from "../game/state/save-types.ts";
import { AutosaveSystem } from "../game/systems/AutosaveSystem.ts";
import { CameraFollowSystem } from "../game/systems/CameraFollowSystem.ts";
import { ExposureSystem } from "../game/systems/ExposureSystem.ts";
import { InputIntentSystem } from "../game/systems/InputIntentSystem.ts";
import { LootBoxChunkSystem } from "../game/systems/LootBoxChunkSystem.ts";
import { LootInteractSystem } from "../game/systems/LootInteractSystem.ts";
import { NeedsDecaySystem } from "../game/systems/NeedsDecaySystem.ts";
import { PlayerTilePositionSystem } from "../game/systems/PlayerTilePositionSystem.ts";
import { PointerMarkerSystem } from "../game/systems/PointerMarkerSystem.ts";
import { TerminatorSystem } from "../game/systems/TerminatorSystem.ts";
import { TilemapCollisionSystem } from "../game/systems/TilemapCollisionSystem.ts";
import { TopDownControllerSystem } from "../game/systems/TopDownControllerSystem.ts";
import { createHud } from "../game/ui/createHud.ts";
import { getAmbientTemperature } from "../game/ui/environment-temperature.ts";
import { TitleMenuInputComponent } from "../game/ui/TitleMenuInputComponent.ts";
import { TitleMenuRenderComponent } from "../game/ui/TitleMenuRenderComponent.ts";
import { TitleMenuState } from "../game/ui/TitleMenuState.ts";
import { InfiniteTilemap } from "../game/world/InfiniteTilemap.ts";
import { LootBoxField } from "../game/world/LootBoxField.ts";
import { TerminatorModel } from "../game/world/TerminatorModel.ts";
import { getTileSlopeRange, isTileFlat } from "../game/world/tile-types.ts";
import { randomSeed } from "../shared/math/hash.ts";
import { isoToWorld } from "../shared/math/iso.ts";

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

const restorePlayerFromAutosave = (autosave: SaveGameV1 | null, player: PlayerEntity): void => {
  if (!autosave) return;

  player.transform.setPosition(autosave.player.x, autosave.player.y);
  player.body.setVelocity(new Vector2D(autosave.player.vx, autosave.player.vy));
  player.needs.hunger = autosave.needs.hunger;
  player.needs.thirst = autosave.needs.thirst;
  player.needs.sickness = autosave.needs.sickness;
  player.temperature.thermalBalance = autosave.needs.heat - autosave.needs.cold;
  player.temperature.heat = Math.max(0, player.temperature.thermalBalance);
  player.temperature.cold = Math.max(0, -player.temperature.thermalBalance);
  player.health.hp = autosave.hp;
};

const syncPlayerToTerrain = (map: InfiniteTilemap, player: PlayerEntity): void => {
  const position = player.transform.transform.position;
  const elevation = map.getElevationAt(position.x, position.y);
  player.tilePosition.set(position.x, position.y, elevation);
};

const restoreInventoryFromAutosave = (
  autosave: SaveGameV1 | null,
  inventory: InventoryState,
): void => {
  if (!autosave?.inventory) {
    return;
  }

  inventory.hydrate(autosave.inventory);
};

const findInitialPlayerSpawn = (map: InfiniteTilemap): Vector2D => {
  let best = new Vector2D(0, 0);
  let bestScore = -Infinity;

  const isSpawnSafe = (x: number, y: number): boolean => {
    const center = map.getTile(x, y);
    if (!isTileFlat(center)) {
      return false;
    }

    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const neighbor = map.getTile(x + ox, y + oy);
        if (!isTileFlat(neighbor) || neighbor.elevation !== center.elevation) {
          return false;
        }
      }
    }

    return true;
  };

  for (let radius = 0; radius <= 28; radius++) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== radius) {
          continue;
        }

        const tile = map.getTile(x, y);
        if (!isSpawnSafe(x, y)) {
          continue;
        }

        const slopePenalty = getTileSlopeRange(tile) * 20;
        const distancePenalty = Math.abs(x) + Math.abs(y);
        const score = 140 + tile.elevation * 16 - slopePenalty - distancePenalty;

        if (score > bestScore) {
          bestScore = score;
          best = new Vector2D(x, y);
        }
      }
    }

    if (bestScore >= 100) {
      return best;
    }
  }

  throw new Error("Failed to find a safe initial spawn tile within search radius");
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
  const gameContext = context;
  gameContext.imageSmoothingEnabled = false;

  const saveManager = new SaveGameManager();
  const autosave = saveManager.loadAutosave();
  const seed = autosave?.seed ?? randomSeed();

  const map = new InfiniteTilemap({ seed, chunkSize: GAME_CONFIG.chunkSize });
  if (autosave) {
    map.applyDeltas(autosave.mapDeltas);
  }

  const lootField = new LootBoxField({
    seed,
    spawnChance: GAME_CONFIG.lootBoxSpawnChance,
  });
  if (autosave?.lootBoxDeltas) {
    lootField.applyDeltas(autosave.lootBoxDeltas);
  }

  const inventory = new InventoryState(GAME_CONFIG.inventorySlots);
  restoreInventoryFromAutosave(autosave, inventory);
  const lootUi = new LootUiState();

  const runtime = new EcsRuntime();
  const world = new World({
    runtime,
    fixedDeltaTime: GAME_CONFIG.fixedDeltaTime,
    maxSubSteps: GAME_CONFIG.maxSubSteps,
    maxFrameDelta: GAME_CONFIG.maxFrameDelta,
  });

  const terminator = new TerminatorModel({
    safeBandHalfWidth: 6,
    travelSpeed: 0.4,
    travelDistance: autosave?.terminatorTravelDistance ?? 0,
    direction: isoToWorld(
      new Vector2D(1, -1),
      { tileWidth: GAME_CONFIG.tileWidth, tileHeight: GAME_CONFIG.tileHeight },
    ).normalize(),
  });
  const terminatorSystem = new TerminatorSystem(terminator);
  if (autosave) {
    terminatorSystem.setElapsedSeconds(autosave.elapsedSeconds);
  }

  const markerState = new MarkerState();
  const canvasState = {
    context,
    size: resizeCanvas(canvas),
  };
  let allowAutosave = true;
  let fps = 0;
  let frameTimeMs = 0;
  let fpsFrames = 0;
  let fpsAccumulator = 0;

  const createSnapshot = (): SaveGameV1 => {
    const position = player.getComponent(TransformComponent).transform.position;
    const velocity = player.body.getVelocity();

    return {
      version: 1,
      seed,
      elapsedSeconds: terminatorSystem.getElapsedSeconds(),
      terminatorTravelDistance: terminator.getTravelDistance(),
      player: {
        x: position.x,
        y: position.y,
        vx: velocity.x,
        vy: velocity.y,
      },
      needs: {
        hunger: player.needs.hunger,
        thirst: player.needs.thirst,
        sickness: player.needs.sickness,
        heat: player.temperature.heat,
        cold: player.temperature.cold,
      },
      hp: player.health.hp,
      mapDeltas: map.serializeDeltas(),
      inventory: inventory.toSnapshot(),
      lootBoxDeltas: lootField.serializeDeltas(),
    };
  };

  const saveNow = (): void => {
    if (!allowAutosave) {
      return;
    }
    saveManager.saveAutosave(createSnapshot());
  };

  const onBeforeUnload = (): void => {
    saveNow();
  };

  const getLootWindow = () => {
    const open = lootUi.openBox;
    if (!open) {
      return null;
    }

    const box = lootField.getBoxAt(open.x, open.y, map);
    if (!box) {
      lootUi.close();
      return null;
    }

    return {
      x: open.x,
      y: open.y,
      slots: box.slots,
    };
  };

  const onLootSlotClick = (slot: number): void => {
    const open = lootUi.openBox;
    if (!open) {
      return;
    }

    const box = lootField.getBoxAt(open.x, open.y, map);
    if (!box) {
      lootUi.close();
      return;
    }

    const stack = box.slots[slot] ?? null;
    if (!stack) {
      return;
    }

    const leftover = inventory.addItem(stack.itemId, stack.count);
    if (leftover >= stack.count) {
      return;
    }

    const updatedSlots = [...box.slots];
    updatedSlots[slot] =
      leftover > 0
        ? {
            itemId: stack.itemId,
            count: leftover,
          }
        : null;
    lootField.setSlots(open.x, open.y, updatedSlots);

    if (!lootField.getBoxAt(open.x, open.y, map)) {
      lootUi.close();
    }
  };

  const resolvePointerWorldPoint = (canvasPoint: Vector2D): { world: Vector2D; elevation: number } => {
    const canvasSize = new Vector2D(canvas.width, canvas.height);
    let bestMatch: { world: Vector2D; elevation: number; distanceSq: number } | null = null;

    for (let elevation = GAME_CONFIG.maxTerrainElevation; elevation >= 0; elevation--) {
      const candidateWorld = camera.canvasToWorldAt(canvasPoint, elevation, canvasSize);
      const surfaceElevation = map.getElevationAt(candidateWorld.x, candidateWorld.y);
      const projected = camera.toCanvasAt(candidateWorld, surfaceElevation, canvasSize);
      const dx = projected.x - canvasPoint.x;
      const dy = projected.y - canvasPoint.y;
      const distanceSq = dx * dx + dy * dy;

      if (!bestMatch || distanceSq < bestMatch.distanceSq) {
        bestMatch = {
          world: candidateWorld,
          elevation: surfaceElevation,
          distanceSq,
        };
      }
    }

    if (bestMatch) {
      return {
        world: bestMatch.world,
        elevation: bestMatch.elevation,
      };
    }

    const fallbackWorld = camera.canvasToWorld(canvasPoint, canvasSize);
    const fallbackElevation = map.getElevationAt(fallbackWorld.x, fallbackWorld.y);
    return {
      world: fallbackWorld,
      elevation: fallbackElevation,
    };
  };

  const onWorldClick = (worldPoint: Vector2D, _canvasPoint: Vector2D, elevation: number): boolean => {
    const tileX = Math.round(worldPoint.x);
    const tileY = Math.round(worldPoint.y);
    const tileElevation = map.getElevationAt(tileX, tileY);
    if (Math.abs(tileElevation - elevation) <= 0.6 && lootField.getBoxAt(tileX, tileY, map)) {
      lootUi.open(tileX, tileY);
      return true;
    }

    const hit = lootField.findNearestBox(worldPoint.x, worldPoint.y, GAME_CONFIG.lootBoxClickRange, map);
    if (!hit) {
      return false;
    }

    if (Math.abs(map.getElevationAt(hit.x, hit.y) - elevation) > 0.6) {
      return false;
    }

    lootUi.open(hit.x, hit.y);
    return true;
  };

  let camera!: IsometricCameraEntity;
  let player!: PlayerEntity;

  EcsRuntime.runWith(runtime, () => {
    camera = new IsometricCameraEntity({
      tileWidth: GAME_CONFIG.tileWidth,
      tileHeight: GAME_CONFIG.tileHeight,
    }, GAME_CONFIG.elevationStepPixels);
    camera.awake();

    const playerSpawn = autosave ? new Vector2D(0, 0) : findInitialPlayerSpawn(map);
    player = new PlayerEntity(playerSpawn, GAME_CONFIG.playerBaseSpeed);
    player.addComponent(new PlayerRenderComponent());
    restorePlayerFromAutosave(autosave, player);
    syncPlayerToTerrain(map, player);
    player.awake();

    const mapRenderBehindNode = new RenderNodeEntity();
    const tileAtlas = createTileAtlas(GAME_CONFIG.tileWidth, GAME_CONFIG.tileHeight);
    mapRenderBehindNode.addComponent(
      new TilemapRenderComponent(
        map,
        terminator,
        tileAtlas,
        GAME_CONFIG.tileWidth,
        GAME_CONFIG.tileHeight,
        {
          isSelectedAt: (x, y, z) => {
            const open = lootUi.openBox;
            if (!open || open.x !== x || open.y !== y) {
              return false;
            }

            return Math.abs(map.getElevationAt(open.x, open.y) - z) <= 0.6;
          },
          maxTerrainElevation: GAME_CONFIG.maxTerrainElevation,
          southCullingPadding: 6,
        },
        runtime,
      ),
    );
    mapRenderBehindNode.awake();

    const markerNode = new RenderNodeEntity();
    markerNode.addComponent(new WorldMarkerRenderComponent(markerState));
    markerNode.awake();

    createHud({
      getInfo: () => ({
        hp: player.health.hp,
        hunger: player.needs.hunger,
        thirst: player.needs.thirst,
        ambientCelsius: getAmbientTemperature(terminator, player.transform.transform.position).celsius,
      }),
      getTemperature: () => {
        const position = player.transform.transform.position;
        const ambient = getAmbientTemperature(terminator, position);
        return {
          ambientCelsius: ambient.celsius,
        };
      },
      getFps: () => ({ fps, frameTimeMs }),
      inventory,
      lootUi,
      getLootWindow,
      onLootSlotClick,
      onLootClose: () => lootUi.close(),
    });
  });

  const hudViewport = new HudViewport(
    new Vector2D(GAME_CONFIG.hudReferenceWidth, GAME_CONFIG.hudReferenceHeight),
    "contain",
    true,
  );
  const renderSystem = new RenderSystem(canvasState, camera, runtime, hudViewport);
  const titleRuntime = new EcsRuntime();
  let pendingScene: "title" | "gameplay" | null = null;

  class HudOnlyCamera extends Entity {
    public toCanvas(worldPos: Vector2D): Vector2D {
      return worldPos;
    }

    public override update(_dt: number): void {}
  }

  class HudRootEntity extends Entity {
    public override update(_dt: number): void {}
  }

  const titleCamera = new HudOnlyCamera();
  const titleRenderSystem = new RenderSystem(canvasState, titleCamera, titleRuntime, hudViewport);

  world.addSystem(new InputIntentSystem(runtime));
  world.addSystem(new LootBoxChunkSystem(map, lootField, player, GAME_CONFIG.chunkRadius));
  world.addSystem(new PlayerTilePositionSystem(map, player));
  world.addSystem(
    new LootInteractSystem(
      map,
      lootField,
      player,
      lootUi,
      {
        interactRange: GAME_CONFIG.lootBoxInteractRange,
      },
      runtime,
    ),
  );
  world.addSystem(
    new PointerMarkerSystem(
      camera,
      canvas,
      markerState,
      runtime,
      onWorldClick,
      resolvePointerWorldPoint,
    ),
  );
  world.addSystem(
    new TopDownControllerSystem(
      {
        isoConfig: {
          tileWidth: GAME_CONFIG.tileWidth,
          tileHeight: GAME_CONFIG.tileHeight,
        },
      },
      runtime,
    ),
  );
  world.addSystem(terminatorSystem);
  world.addSystem(new NeedsDecaySystem(runtime));
  world.addSystem(new ExposureSystem(terminator, runtime));
  world.addSystem(
    new PhysicsSystem({
      gravity: Vector2D.zero,
      velocityIterations: 6,
      positionIterations: 2,
      broadphaseCellSize: 2,
    }),
  );
  world.addSystem(
    new TilemapCollisionSystem(map, player, {
      playerRadius: player.collisionRadius,
      iterations: 5,
      maxStepUp: GAME_CONFIG.maxStepUpHeight,
      maxStepDown: GAME_CONFIG.maxStepDownHeight,
      isBlockedAt: (x, y) => lootField.getBoxAt(x, y, map) !== null,
    }),
  );
  world.addSystem(
    new CameraFollowSystem(
      camera,
      player,
      {
        followStrength: 9,
      },
    ),
  );
  world.addSystem(
    new AutosaveSystem({
      intervalSeconds: GAME_CONFIG.autosaveIntervalSeconds,
      save: saveNow,
    }),
  );

  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("resize", () => {
    canvasState.size = resizeCanvas(canvas);
  });

  const restartGame = (): void => {
    allowAutosave = false;
    saveManager.clearAutosave();
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.location.reload();
  };

  const clearSceneInput = (): void => {
    runtime.input.clearFrame();
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
    sceneManager.changeScene(nextScene === "gameplay" ? new GameplayScene() : new TitleScene());
  };

  const sceneManager = new SceneManager();

  class GameplayScene extends Scene {
    public awake(): void {
      runtime.input.init(window);
    }

    public update(dt: number): void {
      if (runtime.input.isPressed("Escape")) {
        lootUi.close();
        requestTitleScene();
        return;
      }

      world.step(dt);
    }

    public render(_ctx: CanvasRenderingContext2D): void {
      gameContext.imageSmoothingEnabled = false;
      gameContext.setTransform(1, 0, 0, 1, 0, 0);
      gameContext.fillStyle = "#18110d";
      gameContext.fillRect(0, 0, canvas.width, canvas.height);
      renderSystem.render();
    }

    public destroy(): void {
      runtime.input.dispose();
    }
  }

  class TitleScene extends Scene {
    private root: Entity | null = null;

    public awake(): void {
      const state = new TitleMenuState();
      EcsRuntime.runWith(titleRuntime, () => {
        const root = new HudRootEntity();
        root.addComponent(
          new HudLayoutNodeComponent({
            width: GAME_CONFIG.hudReferenceWidth,
            height: GAME_CONFIG.hudReferenceHeight,
            anchor: "center",
          }),
        );
        root.addComponent(new TitleMenuRenderComponent(state));
        root.addComponent(
          new TitleMenuInputComponent(
            state,
            requestGameplayScene,
            restartGame,
          ),
        );
        root.awake();
        this.root = root;
      });
    }

    public update(_dt: number): void {}

    public render(_ctx: CanvasRenderingContext2D): void {
      titleRenderSystem.render();
    }

    public destroy(): void {
      this.root?.destroy();
      this.root = null;
      HudInputRouter.detach(titleRuntime);
      titleRuntime.input.dispose();
    }
  }

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
      EcsRuntime.runWith(runtime, () => {
        EntityProfiler.scanOffscreenCollision(camera);
      });
    },
  };

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
    sceneManager.render(gameContext);
    runtime.input.clearFrame();
    titleRuntime.input.clearFrame();

    window.requestAnimationFrame(frame);
  };

  window.requestAnimationFrame(frame);
};
