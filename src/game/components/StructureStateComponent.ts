import { Component } from "@claudiu-ceia/tick";
import type { StructureInstance } from "../structures/structure-types.ts";

const cloneInstance = (instance: StructureInstance): StructureInstance => ({ ...instance });

export class StructureStateComponent extends Component {
  private instances: StructureInstance[];

  public constructor(instances: readonly StructureInstance[] = []) {
    super();
    this.instances = instances.map(cloneInstance);
  }

  public getInstances(): readonly StructureInstance[] {
    return this.instances;
  }

  public setInstances(instances: readonly StructureInstance[]): void {
    this.instances = instances.map(cloneInstance);
  }

  public addInstance(instance: StructureInstance): void {
    this.instances.push(cloneInstance(instance));
  }
}
