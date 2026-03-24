import type { Component } from "solid-js";
import { createStore } from "solid-js/store";

// Types

export type SidePanelPageKey = string;

export type SidePanelPage = {
  key: SidePanelPageKey;
  instanceId: string;
  title: string;
  icon: Component<{ size?: number; color?: string }>;
  iconColor?: string;
};

export type SidePanelPageInfo = {
  instanceId: string;
  label?: string;
};

export type SidePanelState = {
  isOpen: boolean;
  isClosing: boolean;
  currentPage: SidePanelPage | null;
  navigationStack: SidePanelPage[];
  pageInfo: SidePanelPageInfo | null;
  searchText: string;
  panelWidth: number;
};

// Constants

export const SIDE_PANEL_WIDTH_KEY = "side-panel-width";
export const SIDE_PANEL_WIDTH_DEFAULT = 400;
export const SIDE_PANEL_WIDTH_MIN = 320;
export const SIDE_PANEL_WIDTH_MAX = 600;

// Read and validate width from localStorage synchronously at module evaluation time.
// This runs before any component mounts so the CSS var is set before first render (Req 17.1, 17.2).
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

// Set CSS variable synchronously before first render (Req 17.1)
document.documentElement.style.setProperty(
  "--side-panel-width",
  `${initialWidth}px`,
);

// Store factory

export function createSidePanelStore() {
  const [state, setState] = createStore<SidePanelState>({
    isOpen: false,
    isClosing: false,
    currentPage: null,
    navigationStack: [],
    pageInfo: null,
    searchText: "",
    panelWidth: initialWidth,
  });

  const openPanel = (page: SidePanelPage) => {
    setState({
      isOpen: true,
      isClosing: false,
      navigationStack: [...state.navigationStack, page],
      currentPage: page,
    });
  };

  const closePanel = () => {
    setState({ isOpen: false, isClosing: true });
  };

  const onCloseAnimationComplete = () => {
    setState({ isClosing: false, currentPage: null });
  };

  const navigateTo = (
    page: SidePanelPage,
    opts?: { resetStack?: boolean },
  ) => {
    if (opts?.resetStack) {
      setState({ navigationStack: [page], currentPage: page });
    } else {
      setState({
        navigationStack: [...state.navigationStack, page],
        currentPage: page,
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
      currentPage: newStack[newStack.length - 1],
    });
  };

  const navigateToStackIndex = (index: number) => {
    const newStack = state.navigationStack.slice(0, index + 1);
    setState({
      navigationStack: newStack,
      currentPage: newStack[index] ?? null,
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
