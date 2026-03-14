export const GAME_CONFIG = {
  fixedDeltaTime: 1 / 60,
  maxSubSteps: 8,
  maxFrameDelta: 0.25,
  hudReferenceWidth: 1920,
  hudReferenceHeight: 1080,
  tileWidth: 128,
  tileHeight: 64,
  elevationStepPixels: 24,
  maxTerrainElevation: 6,
  chunkSize: 16,
  chunkRadius: 2,
  chunkPrewarmRadius: 3,
  playerBaseSpeed: 4.2,
  npcSpawnChance: 0.0025,
  autosaveIntervalSeconds: 10,
  inventorySlots: 16,
  inventoryQuickSlots: 2,
  lootBoxInteractRange: 1.35,
  lootBoxSpawnChance: 0.0025,
  maxStepUpHeight: 1,
  maxStepDownHeight: 1,

  // Thermal / exposure
  thermalRecoveryRate: 5.5,
  thermalGrowthBase: 2.2,
  thermalGrowthScale: 0.9,
  thermalDamageThreshold: 80,
  thermalDamageRate: 0.05,

  // Needs decay
  hungerDecayRate: 0.95,
  thirstDecayRate: 1.35,
  sicknessRate: 0.02,
  hungerDamageRate: 1.3,
  thirstDamageRate: 2.1,

  // Interaction
  lootElevationTolerance: 0.6,

  // Terminator defaults
  terminatorSafeBandHalfWidth: 6,
  terminatorTravelSpeed: 0.4,

  // Camera
  cameraFollowStrength: 9,
  southCullingPadding: 6,

  // Player movement tuning
  playerAccelerationScale: 12,
  playerDamping: 18,
  playerWalkMultiplier: 0.62,
  playerCrouchMultiplier: 0.38,

  // Visibility
  playerVisibilityFovDegrees: 72,
  playerVisibilityRayCount: 49,
  playerVisibilityProximityRadius: 2.5,
  visibilityTileSampleStep: 0.2,
} as const;

export const STORAGE_KEYS = {
  autosave: "chasing-shadow.autosave.v1",
} as const;
