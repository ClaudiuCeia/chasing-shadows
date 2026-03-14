import { Component, type Entity } from "@claudiu-ceia/tick";
import type { ItemId } from "../items/item-catalog.ts";
import type { RaycastPoint, RaycastResult } from "./RaycastEmitterComponent.ts";

export type WeaponRaycastMode = "fire-at-will" | "targeted" | null;

export class WeaponRaycastComponent extends Component {
  public weaponItemId: ItemId | null = null;
  public mode: WeaponRaycastMode = null;
  public hoveredTarget: Entity | null = null;
  public targetPoint: RaycastPoint | null = null;
  public lastResolvedShotCounter = 0;
  public lastAimSignature = "";
  public rayCount = 0;
  public rays: RaycastResult[] = [];

  public clearHover(): void {
    this.hoveredTarget = null;
    this.targetPoint = null;
  }

  public clearRays(): void {
    this.rays = [];
    this.rayCount = 0;
    this.lastAimSignature = "";
  }

  public setRays(rays: RaycastResult[]): void {
    this.rays = rays;
    this.rayCount = rays.length;
  }
}
