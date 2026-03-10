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
import { InfiniteTilemap } from "../game/world/InfiniteTilemap.ts";
import { LootBoxField } from "../game/world/LootBoxField.ts";
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

const restoreInventoryFromAutosave = (
  autosave: SaveGameV1 | null,
  inventory: InventoryState,
): void => {
  if (!autosave?.inventory) {
    return;
  }

  inventory.hydrate(autosave.inventory);
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

  const onWorldClick = (worldPoint: Vector2D): boolean => {
    const hit = lootField.findNearestBox(
      worldPoint.x,
      worldPoint.y,
      GAME_CONFIG.lootBoxClickRange,
      map,
    );
    if (!hit) {
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
        tileAtlas,
        GAME_CONFIG.tileWidth,
        GAME_CONFIG.tileHeight,
        {
          isSelectedAt: (x, y) => lootUi.openBox?.x === x && lootUi.openBox?.y === y,
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
        seed,
        elapsedSeconds: terminatorSystem.getElapsedSeconds(),
        hp: player.health.hp,
        hunger: player.needs.hunger,
        thirst: player.needs.thirst,
        heat: player.temperature.heat,
        cold: player.temperature.cold,
      }),
      inventory,
      lootUi,
      getLootWindow,
      onLootSlotClick,
      onLootClose: () => lootUi.close(),
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
  world.addSystem(new PointerMarkerSystem(camera, canvas, markerState, runtime, onWorldClick));
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
