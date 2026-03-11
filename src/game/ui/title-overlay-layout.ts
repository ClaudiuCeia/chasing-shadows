export type TitleOverlayButtonLayout = {
  action: "continue" | "new";
  x: number;
  y: number;
  width: number;
  height: number;
};

type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const getTitleOverlayButtons = (frame: Frame): TitleOverlayButtonLayout[] => {
  const buttonWidth = 320;
  const buttonHeight = 68;
  const gap = 20;
  const x = Math.floor(frame.x + frame.width / 2 - buttonWidth / 2);
  const startY = Math.floor(frame.y + frame.height * 0.56);

  return [
    {
      action: "continue",
      x,
      y: startY,
      width: buttonWidth,
      height: buttonHeight,
    },
    {
      action: "new",
      x,
      y: startY + buttonHeight + gap,
      width: buttonWidth,
      height: buttonHeight,
    },
  ];
};

export const getTitleOverlayActionAtPoint = (
  frame: Frame,
  x: number,
  y: number,
): "continue" | "new" | null => {
  for (const button of getTitleOverlayButtons(frame)) {
    if (
      x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height
    ) {
      return button.action;
    }
  }

  return null;
};
