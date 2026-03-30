export type VerticalNavigationAction =
  | { type: "move"; nextIndex: number }
  | { type: "trigger" }
  | null;

export type VerticalNavigationOptions = {
  currentIndex: number;
  itemCount: number;
  loop?: boolean;
  includeHomeEnd?: boolean;
  includeEnter?: boolean;
};

export function getVerticalNavigationAction(
  key: string,
  options: VerticalNavigationOptions,
): VerticalNavigationAction {
  if (options.itemCount === 0) {
    return null;
  }

  if (key === "ArrowDown") {
    return {
      type: "move",
      nextIndex: getNextIndex(options.currentIndex, 1, options),
    };
  }

  if (key === "ArrowUp") {
    return {
      type: "move",
      nextIndex: getNextIndex(options.currentIndex, -1, options),
    };
  }

  if (options.includeHomeEnd && key === "Home") {
    return { type: "move", nextIndex: 0 };
  }

  if (options.includeHomeEnd && key === "End") {
    return { type: "move", nextIndex: options.itemCount - 1 };
  }

  if (options.includeEnter && key === "Enter") {
    return { type: "trigger" };
  }

  return null;
}

function getNextIndex(
  currentIndex: number,
  direction: -1 | 1,
  options: VerticalNavigationOptions,
) {
  const proposedIndex = currentIndex + direction;

  if (options.loop) {
    return (
      ((proposedIndex % options.itemCount) + options.itemCount) %
      options.itemCount
    );
  }

  return Math.min(Math.max(proposedIndex, 0), options.itemCount - 1);
}
