import { Component } from "@claudiu-ceia/tick";

export type TopDownControllerConfig = {
  maxSpeed: number;
  acceleration: number;
  damping: number;
  sprintMultiplier: number;
};

const defaultConfig: TopDownControllerConfig = {
  maxSpeed: 5,
  acceleration: 24,
  damping: 8,
  sprintMultiplier: 1.4,
};

export class TopDownControllerComponent extends Component {
  public static type = "topdown-controller";

  public readonly config: TopDownControllerConfig;

  public constructor(config: Partial<TopDownControllerConfig> = {}) {
    super();
    this.config = { ...defaultConfig, ...config };
  }
}
