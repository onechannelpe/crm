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
import {
  clampSidePanelWidth,
  SIDE_PANEL_WIDTH_CONSTRAINTS,
  persistSidePanelWidthToCookie,
} from "./side-panel-width";

type SidePanelStoreOptions = {
  initialWidth?: number;
};

export function createSidePanelStore(options?: SidePanelStoreOptions) {
  const [state, setState] = createStore<SidePanelState>({
    isOpen: false,
    isClosing: false,
    stack: [],
    pageStateById: {},
    searchText: "",
    panelWidth: options?.initialWidth ?? SIDE_PANEL_WIDTH_CONSTRAINTS.default,
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
    const nextWidth = clampSidePanelWidth(width);
    applyAction({
      type: "set-panel-width",
      width: nextWidth,
    });
    persistSidePanelWidthToCookie(nextWidth);
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
