import {
  CircleCollisionShape,
  PhysicsBodyComponent,
  PhysicsBodyType,
  Vector2D,
} from "@claudiu-ceia/tick";
import { HealthComponent } from "../components/HealthComponent.ts";
import { HighlightComponent } from "../components/HighlightComponent.ts";
import { IsometricRenderNodeComponent } from "../components/IsometricRenderNodeComponent.ts";
import { MovementIntentComponent } from "../components/MovementIntentComponent.ts";
import { NpcTagComponent } from "../components/NpcTagComponent.ts";
import { RaycastEmitterComponent } from "../components/RaycastEmitterComponent.ts";
import { RoamingBehaviorComponent } from "../components/RoamingBehaviorComponent.ts";
import { TargetableComponent } from "../components/TargetableComponent.ts";
import { TilePositionComponent } from "../components/TilePositionComponent.ts";
import { TopDownControllerComponent } from "../components/TopDownControllerComponent.ts";
import { GAME_CONFIG } from "../config/game-config.ts";
import { NpcRenderComponent } from "../render/NpcRenderComponent.ts";
import type { InfiniteTilemap } from "../world/InfiniteTilemap.ts";
import { ObstacleEntity } from "./ObstacleEntity.ts";

const NPC_MOVEMENT_COLLISION_RADIUS = 0.5;
const NPC_HIT_HEIGHT = 4.3;
const NPC_RAYCAST_DISTANCE = 12;

export class NpcEntity extends ObstacleEntity {
  public readonly collisionRadius = NPC_MOVEMENT_COLLISION_RADIUS;
  public readonly tilePosition: TilePositionComponent;
  public readonly body: PhysicsBodyComponent;
  public readonly health: HealthComponent;
  public readonly highlight: HighlightComponent;
  public readonly rayEmitter: RaycastEmitterComponent;
  public readonly roaming: RoamingBehaviorComponent;
  public readonly targetable: TargetableComponent;
  private tilemap: InfiniteTilemap | null = null;

  public constructor(spawn: Vector2D, seed: number) {
    super({
      position: spawn,
      shape: new CircleCollisionShape(NPC_MOVEMENT_COLLISION_RADIUS),
      hitHeight: NPC_HIT_HEIGHT,
    });

    this.tilePosition = new TilePositionComponent(spawn.x, spawn.y, 0);
    this.body = new PhysicsBodyComponent({
      type: PhysicsBodyType.Dynamic,
      gravityScale: 0,
      linearDamping: 0,
      friction: 0.2,
      restitution: 0,
      canSleep: false,
    });
    this.health = new HealthComponent();
    this.highlight = new HighlightComponent("target-outline");
    this.rayEmitter = new RaycastEmitterComponent({
      maxDistance: NPC_RAYCAST_DISTANCE,
      fovRadians: 0,
      rayCount: 1,
    });
    this.targetable = new TargetableComponent(NPC_HIT_HEIGHT * 0.72);
    this.roaming = new RoamingBehaviorComponent({
      anchorX: Math.floor(spawn.x),
      anchorY: Math.floor(spawn.y),
      intervalSeconds: 5,
      seed,
    });

    this.addComponent(new IsometricRenderNodeComponent());
    this.addComponent(this.tilePosition);
    this.addComponent(new NpcTagComponent());
    this.addComponent(new MovementIntentComponent());
    this.addComponent(
      new TopDownControllerComponent({
        maxSpeed: GAME_CONFIG.playerBaseSpeed,
        acceleration: GAME_CONFIG.playerBaseSpeed * GAME_CONFIG.playerAccelerationScale,
        damping: GAME_CONFIG.playerDamping,
        walkMultiplier: GAME_CONFIG.playerWalkMultiplier,
        crouchMultiplier: GAME_CONFIG.playerCrouchMultiplier,
      }),
    );
    this.addComponent(this.body);
    this.addComponent(this.health);
    this.addComponent(this.highlight);
    this.addComponent(this.rayEmitter);
    this.addComponent(this.targetable);
    this.addComponent(this.roaming);
    this.addComponent(new NpcRenderComponent());
  }

  public bindTilemap(tilemap: InfiniteTilemap): void {
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
    this.tilePosition.set(position.x, position.y, this.tilemap.getElevationAt(position.x, position.y));
    this.rayEmitter.setOriginHeight(this.hitCollider.bodyHeight);
  }
}
