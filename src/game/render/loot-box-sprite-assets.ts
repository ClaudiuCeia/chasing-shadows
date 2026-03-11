import { EcsRuntime, defineAssetManifest } from "@claudiu-ceia/tick";
import BoxesSheetPng from "../../../assets/cardboard-box/boxes_SpriteSheet.png";
import BoxPointerPng from "../../../assets/cardboard-box/box pointer.png";
import BoxShadowPng from "../../../assets/cardboard-box/shadow.png";

export type BoxSprites = {
  sheet: HTMLImageElement;
  shadow: HTMLImageElement;
  pointer: HTMLImageElement;
};

const LOOT_BOX_SPRITE_MANIFEST = defineAssetManifest({
  images: {
    sheet: BoxesSheetPng,
    shadow: BoxShadowPng,
    pointer: BoxPointerPng,
  },
});

let lootBoxSpritesPromise: Promise<BoxSprites> | null = null;

export const getLootBoxSprites = (
  runtime: EcsRuntime = EcsRuntime.getCurrent(),
): Promise<BoxSprites> => {
  if (!lootBoxSpritesPromise) {
    lootBoxSpritesPromise = runtime.assets
      .load(LOOT_BOX_SPRITE_MANIFEST, { scopeLabel: "loot-box-sprites" })
      .then((assets) => ({
        sheet: assets.images.sheet,
        shadow: assets.images.shadow,
        pointer: assets.images.pointer,
      }));
  }

  return lootBoxSpritesPromise;
};
