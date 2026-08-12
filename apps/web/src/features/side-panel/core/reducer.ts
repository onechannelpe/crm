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
  | { type: "set-search-text"; text: string };

export type SidePanelStatePatch = Partial<
  Pick<
    SidePanelState,
    "isOpen" | "isClosing" | "stack" | "pageStateById" | "searchText"
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

    if (!state) {
      continue;
    }

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

    /*
      The stack outlives the close request so the panel keeps rendering its last
      page while it slides away. Once that animation is over nothing reads it,
      so this is where the history and the per-page drafts are dropped.
    */
    case "close-animation-complete":
      return {
        isClosing: false,
        stack: [],
        pageStateById: {},
        searchText: "",
      };

    case "navigate-to": {
      const nextEntry = action.page.entry;
      const nextState = action.page.state;

      if (action.resetStack) {
        return {
          isOpen: true,
          isClosing: false,
          stack: [nextEntry],
          pageStateById: {
            [nextEntry.pageId]: nextState,
          },
        };
      }

      return {
        isOpen: true,
        isClosing: false,
        stack: [...state.stack, nextEntry],
        pageStateById: {
          ...state.pageStateById,
          [nextEntry.pageId]: nextState,
        },
      };
    }

    case "go-back": {
      if (state.stack.length <= 1) {
        return {
          isOpen: false,
          isClosing: true,
          searchText: "",
        };
      }

      const nextStack = state.stack.slice(0, -1);

      return {
        stack: nextStack,
        pageStateById: retainPageStateByNavigationStack(
          state.pageStateById,
          nextStack,
        ),
      };
    }

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
