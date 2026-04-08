import type {
  SidePanelPageDefinition,
  SidePanelPageState,
} from "../types/side-panel-page";
import type { SidePanelState } from "../types/side-panel-state";

export type SidePanelAction =
  | { type: "open-panel"; page: SidePanelPageDefinition }
  | { type: "close-panel" }
  | { type: "close-animation-complete" }
  | { type: "navigate-to"; page: SidePanelPageDefinition; resetStack?: boolean }
  | { type: "go-back" }
  | { type: "navigate-to-stack-index"; index: number }
  | { type: "set-search-text"; text: string }
  | { type: "set-panel-width"; width: number };

function isSameNavigationEntry(
  left: SidePanelPageDefinition,
  right: SidePanelPageDefinition,
) {
  return (
    left.entry.page === right.entry.page &&
    left.entry.pageId === right.entry.pageId
  );
}

export function reduceSidePanelState(
  state: SidePanelState,
  action: SidePanelAction,
): Partial<SidePanelState> {
  switch (action.type) {
    case "open-panel": {
      const currentFrame = state.stack.at(-1);

      if (currentFrame && isSameNavigationEntry(currentFrame, action.page)) {
        return {
          isOpen: true,
          isClosing: false,
          searchText: "",
          stack: [...state.stack.slice(0, -1), action.page],
        };
      }

      return {
        isOpen: true,
        isClosing: false,
        searchText: "",
        stack: [action.page],
      };
    }
    case "close-panel":
      if (!state.isOpen && !state.isClosing) {
        return {};
      }

      return { isOpen: false, isClosing: true, searchText: "" };
    case "close-animation-complete":
      return { isClosing: false };
    case "navigate-to":
      if (action.resetStack) {
        return { isOpen: true, isClosing: false, stack: [action.page] };
      }

      return {
        isOpen: true,
        isClosing: false,
        stack: [...state.stack, action.page],
      };
    case "go-back":
      if (state.stack.length <= 1) {
        return { isOpen: false, isClosing: true, searchText: "" };
      }

      return { stack: state.stack.slice(0, -1) };
    case "navigate-to-stack-index": {
      const boundedIndex = Math.max(
        0,
        Math.min(action.index, state.stack.length - 1),
      );

      return {
        stack: state.stack.slice(0, boundedIndex + 1),
      };
    }
    case "set-search-text":
      return { searchText: action.text };
    case "set-panel-width":
      return { panelWidth: action.width };
    default: {
      const exhaustive: never = action;
      throw new Error(`Unhandled side panel action: ${String(exhaustive)}`);
    }
  }
}

export function updateSidePanelFrameState(
  stack: SidePanelPageDefinition[],
  pageId: string,
  updater: (state: SidePanelPageState) => SidePanelPageState,
) {
  const frameIndex = stack.findIndex((frame) => frame.entry.pageId === pageId);

  if (frameIndex === -1) {
    return stack;
  }

  return stack.map((frame, index) => {
    if (index !== frameIndex) {
      return frame;
    }

    return {
      ...frame,
      state: updater(frame.state),
    };
  });
}
