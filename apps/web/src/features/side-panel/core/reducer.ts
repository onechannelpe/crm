import type {
  SidePanelNavigationEntry,
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

export type SidePanelStatePatch = Partial<
  Pick<
    SidePanelState,
    | "isOpen"
    | "isClosing"
    | "stack"
    | "pageStateById"
    | "searchText"
    | "panelWidth"
  >
>;

function isSameNavigationEntry(
  left: SidePanelNavigationEntry,
  right: SidePanelNavigationEntry,
) {
  return left.page === right.page && left.pageId === right.pageId;
}

function retainPageStateByNavigationStack(
  pageStateById: Record<string, SidePanelPageState>,
  stack: SidePanelNavigationEntry[],
) {
  const retained: Record<string, SidePanelPageState> = {};

  for (const entry of stack) {
    const state = pageStateById[entry.pageId];
    if (!state) continue;
    retained[entry.pageId] = state;
  }

  return retained;
}

export function reduceSidePanelPatch(
  state: SidePanelState,
  action: SidePanelAction,
): SidePanelStatePatch | null {
  switch (action.type) {
    case "open-panel": {
      const currentEntry = state.stack.at(-1);
      const nextEntry = action.page.entry;
      const nextState = action.page.state;

      if (currentEntry && isSameNavigationEntry(currentEntry, nextEntry)) {
        return {
          isOpen: true,
          isClosing: false,
          searchText: "",
          pageStateById: {
            ...state.pageStateById,
            [nextEntry.pageId]: nextState,
          },
        };
      }

      return {
        isOpen: true,
        isClosing: false,
        searchText: "",
        stack: [nextEntry],
        pageStateById: {
          [nextEntry.pageId]: nextState,
        },
      };
    }
    case "close-panel":
      if (!state.isOpen && !state.isClosing) {
        return null;
      }

      return {
        isOpen: false,
        isClosing: true,
        searchText: "",
      };
    case "close-animation-complete":
      return { isClosing: false };
    case "navigate-to":
      if (action.resetStack) {
        const nextEntry = action.page.entry;
        return {
          isOpen: true,
          isClosing: false,
          stack: [nextEntry],
          pageStateById: {
            [nextEntry.pageId]: action.page.state,
          },
        };
      }

      return {
        isOpen: true,
        isClosing: false,
        stack: [...state.stack, action.page.entry],
        pageStateById: {
          ...state.pageStateById,
          [action.page.entry.pageId]: action.page.state,
        },
      };
    case "go-back":
      if (state.stack.length <= 1) {
        return {
          isOpen: false,
          isClosing: true,
          searchText: "",
        };
      }

      return {
        stack: state.stack.slice(0, -1),
        pageStateById: retainPageStateByNavigationStack(
          state.pageStateById,
          state.stack.slice(0, -1),
        ),
      };
    case "navigate-to-stack-index": {
      const boundedIndex = Math.max(
        0,
        Math.min(action.index, state.stack.length - 1),
      );
      const nextStack = state.stack.slice(0, boundedIndex + 1);

      return {
        stack: nextStack,
        pageStateById: retainPageStateByNavigationStack(
          state.pageStateById,
          nextStack,
        ),
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

export function updateSidePanelPageState(
  pageStateById: Record<string, SidePanelPageState>,
  pageId: string,
  updater: (state: SidePanelPageState) => SidePanelPageState,
) {
  const current = pageStateById[pageId];

  if (!current) {
    return pageStateById;
  }

  return {
    ...pageStateById,
    [pageId]: updater(current),
  };
}
