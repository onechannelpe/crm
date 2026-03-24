import { createStore } from "solid-js/store";

import type {
  SidePanelNavigationEntry,
  SidePanelPageDefinition,
  SidePanelPageState,
} from "../types/side-panel-page";
import type { SidePanelState } from "../types/side-panel-state";

// Constants

export const SIDE_PANEL_WIDTH_KEY = "side-panel-width";
export const SIDE_PANEL_WIDTH_DEFAULT = 400;
export const SIDE_PANEL_WIDTH_MIN = 320;
export const SIDE_PANEL_WIDTH_MAX = 600;

// Read and validate width from localStorage synchronously at module evaluation time.
function readInitialWidth(): number {
  try {
    const raw = localStorage.getItem(SIDE_PANEL_WIDTH_KEY);
    if (raw === null) return SIDE_PANEL_WIDTH_DEFAULT;
    const parsed = parseInt(raw, 10);
    if (
      Number.isNaN(parsed) ||
      parsed < SIDE_PANEL_WIDTH_MIN ||
      parsed > SIDE_PANEL_WIDTH_MAX
    ) {
      return SIDE_PANEL_WIDTH_DEFAULT;
    }
    return parsed;
  } catch {
    return SIDE_PANEL_WIDTH_DEFAULT;
  }
}

const initialWidth = readInitialWidth();

if (typeof document !== "undefined") {
  document.documentElement.style.setProperty(
    "--side-panel-width",
    `${initialWidth}px`,
  );
}

// Store factory

function retainPageStateByNavigationStack(
  pageStateById: Record<string, SidePanelPageState>,
  navigationStack: SidePanelNavigationEntry[],
) {
  const retainedState: Record<string, SidePanelPageState> = {};

  for (const entry of navigationStack) {
    const state = pageStateById[entry.pageId];

    if (!state) continue;

    retainedState[entry.pageId] = state;
  }

  return retainedState;
}

export function createSidePanelStore() {
  const [state, setState] = createStore<SidePanelState>({
    isOpen: false,
    isClosing: false,
    navigationStack: [],
    pageStateById: {},
    searchText: "",
    panelWidth: initialWidth,
  });

  const openPanel = (page: SidePanelPageDefinition) => {
    setState({
      isOpen: true,
      isClosing: false,
      navigationStack: [page.entry],
      pageStateById: {
        [page.entry.pageId]: page.state,
      },
      searchText: "",
    });
  };

  const closePanel = () => {
    if (!state.isOpen && !state.isClosing) return;
    setState({ isOpen: false, isClosing: true });
  };

  const onCloseAnimationComplete = () => {
    setState({
      isClosing: false,
      navigationStack: [],
      pageStateById: {},
      searchText: "",
    });
  };

  const navigateTo = (
    page: SidePanelPageDefinition,
    opts?: { resetStack?: boolean },
  ) => {
    if (opts?.resetStack) {
      setState({
        isOpen: true,
        isClosing: false,
        navigationStack: [page.entry],
        pageStateById: {
          [page.entry.pageId]: page.state,
        },
      });

      return;
    } else {
      const nextNavigationStack = [...state.navigationStack, page.entry];

      setState({
        isOpen: true,
        isClosing: false,
        navigationStack: nextNavigationStack,
        pageStateById: {
          ...state.pageStateById,
          [page.entry.pageId]: page.state,
        },
      });
    }
  };

  const goBack = () => {
    const stack = state.navigationStack;
    if (stack.length <= 1) {
      closePanel();
      return;
    }
    const newStack = stack.slice(0, -1);
    setState({
      navigationStack: newStack,
      pageStateById: retainPageStateByNavigationStack(state.pageStateById, newStack),
    });
  };

  const navigateToStackIndex = (index: number) => {
    const boundedIndex = Math.max(
      0,
      Math.min(index, state.navigationStack.length - 1),
    );
    const newStack = state.navigationStack.slice(0, boundedIndex + 1);
    setState({
      navigationStack: newStack,
      pageStateById: retainPageStateByNavigationStack(state.pageStateById, newStack),
    });
  };

  const setSearchText = (text: string) => {
    setState({ searchText: text });
  };

  const setPanelWidth = (width: number) => {
    setState({ panelWidth: width });
    try {
      localStorage.setItem(SIDE_PANEL_WIDTH_KEY, String(width));
    } catch {
      // localStorage may be unavailable in some environments
    }
  };

  return {
    state,
    openPanel,
    closePanel,
    navigateTo,
    goBack,
    navigateToStackIndex,
    onCloseAnimationComplete,
    setSearchText,
    setPanelWidth,
  };
}
