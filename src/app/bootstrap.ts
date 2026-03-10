import {
  EcsRuntime,
  HudViewport,
  PhysicsSystem,
  RenderSystem,
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
import { MarkerState } from "../game/state/MarkerState.ts";
import { SaveGameManager } from "../game/state/SaveGameManager.ts";
import type { SaveGameV1 } from "../game/state/save-types.ts";
import { AutosaveSystem } from "../game/systems/AutosaveSystem.ts";
import { CameraFollowSystem } from "../game/systems/CameraFollowSystem.ts";
import { ExposureSystem } from "../game/systems/ExposureSystem.ts";
import { InputIntentSystem } from "../game/systems/InputIntentSystem.ts";
import { NeedsDecaySystem } from "../game/systems/NeedsDecaySystem.ts";
import { PointerMarkerSystem } from "../game/systems/PointerMarkerSystem.ts";
import { TerminatorSystem } from "../game/systems/TerminatorSystem.ts";
import { TilemapCollisionSystem } from "../game/systems/TilemapCollisionSystem.ts";
import { TopDownControllerSystem } from "../game/systems/TopDownControllerSystem.ts";
import { createHud } from "../game/ui/createHud.ts";
import { InfiniteTilemap } from "../game/world/InfiniteTilemap.ts";
import { TerminatorModel } from "../game/world/TerminatorModel.ts";
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

  const saveManager = new SaveGameManager();
  const autosave = saveManager.loadAutosave();
  const seed = autosave?.seed ?? randomSeed();

  const map = new InfiniteTilemap({ seed, chunkSize: GAME_CONFIG.chunkSize });
  if (autosave) {
    map.applyDeltas(autosave.mapDeltas);
  } else {
    map.setTile(0, 0, "regolith");
  }

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

  let camera!: IsometricCameraEntity;
  let player!: PlayerEntity;

  EcsRuntime.runWith(runtime, () => {
    camera = new IsometricCameraEntity({
      tileWidth: GAME_CONFIG.tileWidth,
      tileHeight: GAME_CONFIG.tileHeight,
    });
    camera.awake();

    player = new PlayerEntity(new Vector2D(0, 0), GAME_CONFIG.playerBaseSpeed);
    player.addComponent(new PlayerRenderComponent());
    restorePlayerFromAutosave(autosave, player);
    player.awake();

    const mapRenderBehindNode = new RenderNodeEntity();
    const tileAtlas = createTileAtlas(GAME_CONFIG.tileWidth, GAME_CONFIG.tileHeight);
    mapRenderBehindNode.addComponent(
      new TilemapRenderComponent(
        map,
        terminator,
        player,
        "behind-player",
        tileAtlas,
        GAME_CONFIG.tileWidth,
        GAME_CONFIG.tileHeight,
      ),
    );
    mapRenderBehindNode.awake();

    const mapRenderFrontNode = new RenderNodeEntity();
    mapRenderFrontNode.addComponent(
      new TilemapRenderComponent(
        map,
        terminator,
        player,
        "front-player",
        tileAtlas,
        GAME_CONFIG.tileWidth,
        GAME_CONFIG.tileHeight,
      ),
    );
    mapRenderFrontNode.awake();

    const markerNode = new RenderNodeEntity();
    markerNode.addComponent(new WorldMarkerRenderComponent(markerState));
    markerNode.awake();

    createHud({
      getInfo: () => ({
        seed,
        elapsedSeconds: terminatorSystem.getElapsedSeconds(),
        hp: player.health.hp,
        hunger: player.needs.hunger,
        thirst: player.needs.thirst,
        heat: player.temperature.heat,
        cold: player.temperature.cold,
      }),
      onStartOver: () => {
        allowAutosave = false;
        saveManager.clearAutosave();
        window.removeEventListener("beforeunload", onBeforeUnload);
        window.location.reload();
      },
    });
  });

  const hudViewport = new HudViewport(
    new Vector2D(GAME_CONFIG.hudReferenceWidth, GAME_CONFIG.hudReferenceHeight),
    "contain",
    true,
  );
  const renderSystem = new RenderSystem(canvasState, camera, runtime, hudViewport);

  world.addSystem(new InputIntentSystem(runtime));
  world.addSystem(new PointerMarkerSystem(camera, canvas, markerState, runtime));
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

  runtime.input.init(window);
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("resize", () => {
    canvasState.size = resizeCanvas(canvas);
  });

  let lastTime = performance.now();
  const frame = (now: number): void => {
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    world.step(deltaTime);
    
    context.imageSmoothingEnabled = false;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#18110d";
    context.fillRect(0, 0, canvas.width, canvas.height);

    renderSystem.render();
    runtime.input.clearFrame();

    window.requestAnimationFrame(frame);
  };

  window.requestAnimationFrame(frame);
};
