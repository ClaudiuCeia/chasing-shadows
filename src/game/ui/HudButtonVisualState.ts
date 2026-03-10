export type HudButtonVisualState = {
  hovered: boolean;
  pressed: boolean;
};

export const createButtonVisualState = (): HudButtonVisualState => ({
  hovered: false,
  pressed: false,
});
