export const GAME_CONFIG = {
  fixedDeltaTime: 1 / 60,
  maxSubSteps: 8,
  maxFrameDelta: 0.25,
  hudReferenceWidth: 1920,
  hudReferenceHeight: 1080,
  tileWidth: 128,
  tileHeight: 64,
  chunkSize: 16,
  chunkRadius: 2,
  playerBaseSpeed: 4.2,
  autosaveIntervalSeconds: 10,
} as const;

export const STORAGE_KEYS = {
  autosave: "mercury.autosave.v1",
} as const;
