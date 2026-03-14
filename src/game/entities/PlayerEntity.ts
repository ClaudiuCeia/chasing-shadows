import {
  CircleCollisionShape,
  CollisionEntity,
  Entity,
  PhysicsBodyComponent,
  PhysicsBodyType,
  TransformComponent,
  Vector2D,
} from "@claudiu-ceia/tick";
import { COLLISION_LAYER_OBSTACLE, COLLISION_LAYER_PLAYER } from "../collision/collision-layers.ts";
import { HealthComponent } from "../components/HealthComponent.ts";
import { InventoryComponent } from "../components/InventoryComponent.ts";
import { PlayerAttackComponent } from "../components/PlayerAttackComponent.ts";
import { IsometricRenderNodeComponent } from "../components/IsometricRenderNodeComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { NeedsComponent } from "../components/NeedsComponent.ts";
import { PlayerTagComponent } from "../components/PlayerTagComponent.ts";
import { RaycastEmitterComponent } from "../components/RaycastEmitterComponent.ts";
import { TemperatureComponent } from "../components/TemperatureComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { WeaponRaycastComponent } from "../components/WeaponRaycastComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { PlayerHitColliderEntity } from "./PlayerHitColliderEntity.ts";
import type { TilemapStateComponent } from "../components/TilemapStateComponent.ts";

const PLAYER_MOVEMENT_COLLISION_RADIUS = 0.5;

export class PlayerEntity extends Entity {
  public readonly collisionRadius = PLAYER_MOVEMENT_COLLISION_RADIUS;

  public readonly transform: TransformComponent;
  public readonly tilePosition: TilePositionComponent;
  public readonly body: PhysicsBodyComponent;
  public readonly needs: NeedsComponent;
  public readonly temperature: TemperatureComponent;
  public readonly health: HealthComponent;
  public readonly inventory: InventoryComponent;
  public readonly attack: PlayerAttackComponent;
  public readonly rayEmitter: RaycastEmitterComponent;
  public readonly weaponRaycast: WeaponRaycastComponent;
  public readonly movementCollider: CollisionEntity;
  public readonly hitCollider: PlayerHitColliderEntity;
  private tilemap: TilemapStateComponent | null = null;

  public constructor(spawn: Vector2D, baseSpeed: number, inventoryCapacity: number) {
    super();

    this.transform = new TransformComponent({ position: spawn, rotation: 0, scale: 1 });
    this.tilePosition = new TilePositionComponent(spawn.x, spawn.y, 0);
    this.body = new PhysicsBodyComponent({
      type: PhysicsBodyType.Dynamic,
      gravityScale: 0,
      linearDamping: 0,
      friction: 0.2,
      restitution: 0,
      canSleep: false,
    });

    this.needs = new NeedsComponent();
    this.temperature = new TemperatureComponent();
    this.health = new HealthComponent();
    this.inventory = new InventoryComponent(inventoryCapacity);
    this.attack = new PlayerAttackComponent();
    this.rayEmitter = new RaycastEmitterComponent({
      maxDistance: 18,
      fovRadians: (GAME_CONFIG.playerVisibilityFovDegrees * Math.PI) / 180,
      rayCount: GAME_CONFIG.playerVisibilityRayCount,
    });
    this.weaponRaycast = new WeaponRaycastComponent();
    this.movementCollider = new CollisionEntity(
      new CircleCollisionShape(this.collisionRadius),
      "center",
      COLLISION_LAYER_PLAYER,
      COLLISION_LAYER_OBSTACLE,
    );
    this.hitCollider = new PlayerHitColliderEntity();

    this.addComponent(this.transform);
    this.addComponent(new IsometricRenderNodeComponent());
    this.addComponent(this.tilePosition);
    this.addComponent(new PlayerTagComponent());
    this.addComponent(new MovementIntentComponent());
    this.addComponent(
      new TopDownControllerComponent({
        maxSpeed: baseSpeed,
        acceleration: baseSpeed * GAME_CONFIG.playerAccelerationScale,
        damping: GAME_CONFIG.playerDamping,
        walkMultiplier: GAME_CONFIG.playerWalkMultiplier,
        crouchMultiplier: GAME_CONFIG.playerCrouchMultiplier,
      }),
    );
    this.addComponent(this.body);
    this.addComponent(this.attack);
    this.addComponent(this.rayEmitter);
    this.addComponent(this.weaponRaycast);
    this.addComponent(this.health);
    this.addComponent(this.inventory);
    this.addComponent(this.needs);
    this.addComponent(this.temperature);

    this.addChild(this.movementCollider);
    this.addChild(this.hitCollider);
  }

  public bindTilemap(tilemap: TilemapStateComponent): void {
    this.tilemap = tilemap;
    const position = this.transform.transform.position;
    this.tilePosition.set(position.x, position.y, tilemap.getElevationAt(position.x, position.y));
  }

  public override update(dt: number): void {
    super.update(dt);
    if (!this.tilemap) {
      return;
    }

    const position = this.transform.transform.position;
    this.tilePosition.set(
      position.x,
      position.y,
      this.tilemap.getElevationAt(position.x, position.y),
    );
    this.rayEmitter.setOriginHeight(this.hitCollider.bodyHeight);
  }
}
