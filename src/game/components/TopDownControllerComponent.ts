import { Component } from "@claudiu-ceia/tick";

export type TopDownControllerConfig = {
  maxSpeed: number;
  acceleration: number;
  damping: number;
  walkMultiplier: number;
  crouchMultiplier: number;
};

const defaultConfig: TopDownControllerConfig = {
  maxSpeed: 5,
  acceleration: 24,
  damping: 8,
  walkMultiplier: 0.6,
  crouchMultiplier: 0.38,
};

export class TopDownControllerComponent extends Component {
  public readonly config: TopDownControllerConfig;

  public constructor(config: Partial<TopDownControllerConfig> = {}) {
    super();
    this.config = { ...defaultConfig, ...config };
  }
}
