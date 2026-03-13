import {
  EcsRuntime,
  HudViewport,
  PhysicsSystem,
  RenderSystem,
  Vector2D,
  World,
} from "@claudiu-ceia/tick";
import { GAME_CONFIG } from "../../game/config/game-config.ts";
import { TilemapStateComponent } from "../../game/components/TilemapStateComponent.ts";
import { PlayerEntity } from "../../game/entities/PlayerEntity.ts";
import { TerminatorEntity } from "../../game/entities/TerminatorEntity.ts";
import { TilemapEntity } from "../../game/entities/TilemapEntity.ts";
import { UiStateEntity } from "../../game/entities/UiStateEntity.ts";
import { WorldStateEntity } from "../../game/entities/WorldStateEntity.ts";
import { DebugRayRenderComponent } from "../../game/render/DebugRayRenderComponent.ts";
import { IsometricCameraEntity } from "../../game/render/IsometricCameraEntity.ts";
import { PlayerRenderComponent } from "../../game/render/PlayerRenderComponent.ts";
import type { SaveGameV1 } from "../../game/state/save-types.ts";
import { AutosaveSystem } from "../../game/systems/AutosaveSystem.ts";
import { CameraFollowSystem } from "../../game/systems/CameraFollowSystem.ts";
import { ChunkPrewarmSystem } from "../../game/systems/ChunkPrewarmSystem.ts";
import { DebugOverlaySystem } from "../../game/systems/DebugOverlaySystem.ts";
import { ExposureSystem } from "../../game/systems/ExposureSystem.ts";
import { InputIntentSystem } from "../../game/systems/InputIntentSystem.ts";
import { InteractableHighlightSystem } from "../../game/systems/InteractableHighlightSystem.ts";
import { InventoryModalSystem } from "../../game/systems/InventoryModalSystem.ts";
import { LootBoxChunkSystem } from "../../game/systems/LootBoxChunkSystem.ts";
import { LootInteractSystem } from "../../game/systems/LootInteractSystem.ts";
import { NeedsDecaySystem } from "../../game/systems/NeedsDecaySystem.ts";
import { ObstacleCollisionSystem } from "../../game/systems/ObstacleCollisionSystem.ts";
import { PlayerAttackSystem } from "../../game/systems/PlayerAttackSystem.ts";
import { PointerMarkerSystem } from "../../game/systems/PointerMarkerSystem.ts";
import { RaycastSystem } from "../../game/systems/RaycastSystem.ts";
import { TerminatorSystem } from "../../game/systems/TerminatorSystem.ts";
import { TilemapCollisionSystem } from "../../game/systems/TilemapCollisionSystem.ts";
import { TopDownControllerSystem } from "../../game/systems/TopDownControllerSystem.ts";
import { WorldPointerActionSystem } from "../../game/systems/WorldPointerActionSystem.ts";
import { createHud } from "../../game/ui/createHud.ts";
import { getTileSlopeRange, isTileFlat } from "../../game/world/tile-types.ts";
import { isoToWorld } from "../../shared/math/iso.ts";

type CanvasState = {
  context: CanvasRenderingContext2D;
  size: Vector2D;
};

type GameplayRoots = {
  worldState: WorldStateEntity;
  uiState: UiStateEntity;
  terminatorEntity: TerminatorEntity;
  tilemapEntity: TilemapEntity;
  player: PlayerEntity;
};

export type GameplaySession = {
  runtime: EcsRuntime;
  world: World;
  camera: IsometricCameraEntity;
  renderSystem: RenderSystem;
  lootUi: UiStateEntity["lootUi"];
  modalState: UiStateEntity["modalState"];
  createAutosaveData: () => SaveGameV1;
};

export type CreateGameplaySessionOptions = {
  canvas: HTMLCanvasElement;
  canvasState: CanvasState;
  autosave: SaveGameV1 | null;
  seed: number;
  getFps: () => { fps: number; frameTimeMs: number };
  onAutosave: () => void;
};

const getDefaultTerminatorDirection = (): Vector2D =>
  isoToWorld(new Vector2D(1, -1), {
    tileWidth: GAME_CONFIG.tileWidth,
    tileHeight: GAME_CONFIG.tileHeight,
  }).normalize();

const syncPlayerToTerrain = (tilemap: TilemapStateComponent, player: PlayerEntity): void => {
  const position = player.transform.transform.position;
  const elevation = tilemap.getElevationAt(position.x, position.y);
  player.tilePosition.set(position.x, position.y, elevation);
};

const applySavedPlayerState = (player: PlayerEntity, tilemap: TilemapStateComponent, autosave: SaveGameV1): void => {
  player.transform.setPosition(autosave.player.position.x, autosave.player.position.y);
  player.transform.setRotation(autosave.player.rotation);
  player.body.setVelocity(new Vector2D(autosave.player.velocity.x, autosave.player.velocity.y));
  player.health.hp = autosave.player.health;
  player.needs.hunger = autosave.player.needs.hunger;
  player.needs.thirst = autosave.player.needs.thirst;
  player.needs.sickness = autosave.player.needs.sickness;
  player.temperature.thermalBalance = autosave.player.temperature.thermalBalance;
  player.temperature.heat = autosave.player.temperature.heat;
  player.temperature.cold = autosave.player.temperature.cold;
  player.inventory.setState(autosave.player.inventory);
  player.attack.fireMode = autosave.player.fireMode;
  syncPlayerToTerrain(tilemap, player);
};

const serializeGameplay = (roots: GameplayRoots): SaveGameV1 => {
  const position = roots.player.transform.transform.position;
  const velocity = roots.player.body.getVelocity();

  return {
    version: 1,
    world: {
      seed: roots.tilemapEntity.tilemap.getSeed(),
      chunkSize: roots.tilemapEntity.tilemap.getChunkSize(),
      lootSpawnChance: roots.worldState.lootField.getSpawnChance() ?? GAME_CONFIG.lootBoxSpawnChance,
      elapsedSeconds: roots.worldState.session.elapsedSeconds,
      terminator: {
        safeBandHalfWidth: roots.terminatorEntity.terminator.safeBandHalfWidth,
        travelSpeed: roots.terminatorEntity.terminator.travelSpeed,
        travelDistance: roots.terminatorEntity.terminator.travelDistance,
        direction: {
          x: roots.terminatorEntity.terminator.direction.x,
          y: roots.terminatorEntity.terminator.direction.y,
        },
      },
      tileDeltas: roots.tilemapEntity.tilemap.serializeDeltas(),
      lootDeltas: roots.worldState.lootField.serializeDeltas(roots.tilemapEntity.tilemap.map),
    },
    player: {
      position: { x: position.x, y: position.y },
      rotation: roots.player.transform.transform.rotation,
      velocity: { x: velocity.x, y: velocity.y },
      health: roots.player.health.hp,
      needs: {
        hunger: roots.player.needs.hunger,
        thirst: roots.player.needs.thirst,
        sickness: roots.player.needs.sickness,
      },
      temperature: {
        thermalBalance: roots.player.temperature.thermalBalance,
        heat: roots.player.temperature.heat,
        cold: roots.player.temperature.cold,
      },
      inventory: roots.player.inventory.getState(),
      fireMode: roots.player.attack.fireMode,
    },
  };
};

const findInitialPlayerSpawn = (tilemap: TilemapStateComponent): { x: number; y: number } => {
  let best = { x: 0, y: 0 };
  let bestScore = -Infinity;

  const isSpawnSafe = (x: number, y: number): boolean => {
    const center = tilemap.getTile(x, y);
    if (!isTileFlat(center)) {
      return false;
    }

    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const neighbor = tilemap.getTile(x + ox, y + oy);
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

        const tile = tilemap.getTile(x, y);
        if (!isSpawnSafe(x, y)) {
          continue;
        }

        const slopePenalty = getTileSlopeRange(tile) * 20;
        const distancePenalty = Math.abs(x) + Math.abs(y);
        const score = 140 + tile.elevation * 16 - slopePenalty - distancePenalty;
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
    }

    if (bestScore >= 100) {
      return best;
    }
  }

  throw new Error("Failed to find a safe initial spawn tile within search radius");
};

export const createGameplaySession = (options: CreateGameplaySessionOptions): GameplaySession => {
  const runtime = new EcsRuntime();
  const world = new World({
    runtime,
    fixedDeltaTime: GAME_CONFIG.fixedDeltaTime,
    maxSubSteps: GAME_CONFIG.maxSubSteps,
    maxFrameDelta: GAME_CONFIG.maxFrameDelta,
  });

  let roots!: GameplayRoots;
  let camera!: IsometricCameraEntity;

  EcsRuntime.runWith(runtime, () => {
    const autosave = options.autosave;
    const seed = autosave?.world.seed ?? options.seed;
    const chunkSize = autosave?.world.chunkSize ?? GAME_CONFIG.chunkSize;
    const lootSpawnChance = autosave?.world.lootSpawnChance ?? GAME_CONFIG.lootBoxSpawnChance;
    const terminatorSave = autosave?.world.terminator;

    const uiState = new UiStateEntity();
    const worldState = new WorldStateEntity({ seed, spawnChance: lootSpawnChance });
    const terminatorEntity = new TerminatorEntity({
      safeBandHalfWidth: terminatorSave?.safeBandHalfWidth ?? GAME_CONFIG.terminatorSafeBandHalfWidth,
      travelSpeed: terminatorSave?.travelSpeed ?? GAME_CONFIG.terminatorTravelSpeed,
      travelDistance: terminatorSave?.travelDistance ?? 0,
      direction: terminatorSave
        ? new Vector2D(terminatorSave.direction.x, terminatorSave.direction.y)
        : getDefaultTerminatorDirection(),
    });
    const tilemapEntity = new TilemapEntity({ seed, chunkSize });

    if (autosave) {
      tilemapEntity.tilemap.applyDeltas(autosave.world.tileDeltas);
      worldState.lootField.applyDeltas(autosave.world.lootDeltas);
      worldState.session.elapsedSeconds = autosave.world.elapsedSeconds;
    }

    const spawn = autosave
      ? new Vector2D(autosave.player.position.x, autosave.player.position.y)
      : (() => {
          const initialSpawn = findInitialPlayerSpawn(tilemapEntity.tilemap);
          return new Vector2D(initialSpawn.x, initialSpawn.y);
        })();

    const player = new PlayerEntity(spawn, GAME_CONFIG.playerBaseSpeed, GAME_CONFIG.inventorySlots);
    player.bindTilemap(tilemapEntity.tilemap);
    player.addComponent(new PlayerRenderComponent());
    player.addComponent(new DebugRayRenderComponent(uiState.debugOverlay, tilemapEntity.tilemap.map));

    if (autosave) {
      applySavedPlayerState(player, tilemapEntity.tilemap, autosave);
    } else {
      syncPlayerToTerrain(tilemapEntity.tilemap, player);
    }

    tilemapEntity.configureRender(terminatorEntity.terminator, {
      tileWidth: GAME_CONFIG.tileWidth,
      tileHeight: GAME_CONFIG.tileHeight,
        render: {
          isSelectedAt: (x, y, z) => {
          const open = uiState.lootUi.openSource;
          if (!open || open.kind !== "tile-box" || open.x !== x || open.y !== y) {
            return false;
          }
          return Math.abs(tilemapEntity.tilemap.getElevationAt(open.x, open.y) - z) <= GAME_CONFIG.lootElevationTolerance;
        },
        maxTerrainElevation: GAME_CONFIG.maxTerrainElevation,
        southCullingPadding: GAME_CONFIG.southCullingPadding,
      },
      runtime,
    });

    uiState.awake();
    worldState.awake();
    terminatorEntity.awake();
    tilemapEntity.awake();
    player.awake();

    roots = {
      worldState,
      uiState,
      terminatorEntity,
      tilemapEntity,
      player,
    };

    camera = new IsometricCameraEntity(
      { tileWidth: GAME_CONFIG.tileWidth, tileHeight: GAME_CONFIG.tileHeight },
      GAME_CONFIG.elevationStepPixels,
    );
    camera.awake();
  });

  const hudViewport = new HudViewport(
    new Vector2D(GAME_CONFIG.hudReferenceWidth, GAME_CONFIG.hudReferenceHeight),
    "contain",
    true,
  );
  const renderSystem = new RenderSystem(options.canvasState, camera, runtime, hudViewport);

  EcsRuntime.runWith(runtime, () => {
    createHud({
      getFps: options.getFps,
      debug: roots.uiState.debugOverlay,
      player: roots.player,
      terminator: roots.terminatorEntity.terminator,
      inventory: roots.player.inventory,
      lootUi: roots.uiState.lootUi,
      modalState: roots.uiState.modalState,
      lootField: roots.worldState.lootField,
      map: roots.tilemapEntity.tilemap.map,
    });
  });

  world.addSystem(new InputIntentSystem(camera, options.canvas, runtime));
  world.addSystem(new InventoryModalSystem(roots.player.inventory, roots.worldState.lootField, roots.tilemapEntity.tilemap.map, runtime));
  world.addSystem(new DebugOverlaySystem(runtime));
  world.addSystem(new InteractableHighlightSystem(roots.player, runtime));
  world.addSystem(
    new ChunkPrewarmSystem(roots.tilemapEntity.tilemap.map, roots.player, {
      radius: GAME_CONFIG.chunkPrewarmRadius,
    }),
  );
  world.addSystem(new LootBoxChunkSystem(roots.tilemapEntity.tilemap.map, roots.player, GAME_CONFIG.chunkRadius, runtime));
  world.addSystem(new PlayerAttackSystem(runtime));
  world.addSystem(new LootInteractSystem(roots.tilemapEntity.tilemap.map, roots.player, { interactRange: GAME_CONFIG.lootBoxInteractRange }, runtime));
  world.addSystem(new PointerMarkerSystem(camera, options.canvas, roots.tilemapEntity.tilemap.map, GAME_CONFIG.maxTerrainElevation, runtime));
  world.addSystem(new WorldPointerActionSystem(roots.tilemapEntity.tilemap.map, GAME_CONFIG.lootBoxInteractRange, runtime));
  world.addSystem(
    new TopDownControllerSystem(
      { isoConfig: { tileWidth: GAME_CONFIG.tileWidth, tileHeight: GAME_CONFIG.tileHeight } },
      runtime,
    ),
  );
  world.addSystem(new TerminatorSystem(runtime));
  world.addSystem(new NeedsDecaySystem(runtime));
  world.addSystem(new ExposureSystem(roots.terminatorEntity.terminator, runtime));
  world.addSystem(new RaycastSystem(roots.tilemapEntity.tilemap.map, runtime));
  world.addSystem(
    new PhysicsSystem({
      gravity: Vector2D.zero,
      velocityIterations: 6,
      positionIterations: 2,
      broadphaseCellSize: 2,
    }),
  );
  world.addSystem(new ObstacleCollisionSystem(roots.player, { iterations: 5 }, runtime));
  world.addSystem(
    new TilemapCollisionSystem(
      roots.tilemapEntity.tilemap.map,
      roots.player,
      {
        playerRadius: roots.player.collisionRadius,
        iterations: 5,
        maxStepUp: GAME_CONFIG.maxStepUpHeight,
        maxStepDown: GAME_CONFIG.maxStepDownHeight,
      },
    ),
  );
  world.addSystem(new CameraFollowSystem(camera, roots.player, { followStrength: GAME_CONFIG.cameraFollowStrength }));
  world.addSystem(
    new AutosaveSystem({
      intervalSeconds: GAME_CONFIG.autosaveIntervalSeconds,
      save: options.onAutosave,
    }),
  );

  return {
    runtime,
    world,
    camera,
    renderSystem,
    lootUi: roots.uiState.lootUi,
    modalState: roots.uiState.modalState,
    createAutosaveData: () => serializeGameplay(roots),
  };
};
