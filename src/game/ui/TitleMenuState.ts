export type TitleMenuAction = "continue" | "new" | null;

export class TitleMenuState {
  public hoveredAction: TitleMenuAction = null;
  public pressedAction: TitleMenuAction = null;
}
