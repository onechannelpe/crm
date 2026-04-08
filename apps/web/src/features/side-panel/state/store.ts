import { createStore } from "solid-js/store";

import {
  reduceSidePanelPatch,
  updateSidePanelPageState,
} from "../core/reducer";
import type {
  SidePanelPageDefinition,
  SidePanelPageState,
} from "../types/side-panel-page";
import type { SidePanelState } from "../types/side-panel-state";

// Constants

export const SIDE_PANEL_WIDTH_KEY = "side-panel-width";
export const SIDE_PANEL_WIDTH_DEFAULT = 400;
export const SIDE_PANEL_WIDTH_MIN = 320;
export const SIDE_PANEL_WIDTH_MAX = 600;

function clampPanelWidth(width: number): number {
  return Math.min(SIDE_PANEL_WIDTH_MAX, Math.max(SIDE_PANEL_WIDTH_MIN, width));
}

export function readStoredSidePanelWidth(): number {
  try {
    const raw = localStorage.getItem(SIDE_PANEL_WIDTH_KEY);
    if (raw === null) return SIDE_PANEL_WIDTH_DEFAULT;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      return SIDE_PANEL_WIDTH_DEFAULT;
    }
    return clampPanelWidth(parsed);
  } catch {
    return SIDE_PANEL_WIDTH_DEFAULT;
  }
}

// Store factory

export function createSidePanelStore() {
  const [state, setState] = createStore<SidePanelState>({
    isOpen: false,
    isClosing: false,
    stack: [],
    pageStateById: {},
    searchText: "",
    panelWidth: SIDE_PANEL_WIDTH_DEFAULT,
  });

  function applyAction(action: Parameters<typeof reduceSidePanelPatch>[1]) {
    const patch = reduceSidePanelPatch(state, action);

    if (!patch) {
      return;
    }

    setState(patch);
  }

  const openPanel = (page: SidePanelPageDefinition) => {
    applyAction({ type: "open-panel", page });
  };

  const closePanel = () => {
    applyAction({ type: "close-panel" });
  };

  const onCloseAnimationComplete = () => {
    applyAction({ type: "close-animation-complete" });
  };

  const navigateTo = (
    page: SidePanelPageDefinition,
    opts?: { resetStack?: boolean },
  ) => {
    applyAction({
      type: "navigate-to",
      page,
      resetStack: opts?.resetStack,
    });
  };

  const goBack = () => {
    applyAction({ type: "go-back" });
  };

  const navigateToStackIndex = (index: number) => {
    applyAction({ type: "navigate-to-stack-index", index });
  };

  const setSearchText = (text: string) => {
    applyAction({ type: "set-search-text", text });
  };

  const updatePageState = (
    pageId: string,
    updater: (state: SidePanelPageState) => SidePanelPageState,
  ) => {
    const updatedPageStateById = updateSidePanelPageState(
      state.pageStateById,
      pageId,
      updater,
    );

    if (updatedPageStateById === state.pageStateById) {
      return;
    }

    setState("pageStateById", updatedPageStateById);
  };

  const setPanelWidth = (width: number) => {
    const nextWidth = clampPanelWidth(width);
    applyAction({
      type: "set-panel-width",
      width: nextWidth,
    });
    try {
      localStorage.setItem(SIDE_PANEL_WIDTH_KEY, String(nextWidth));
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
    updatePageState,
  };
}
