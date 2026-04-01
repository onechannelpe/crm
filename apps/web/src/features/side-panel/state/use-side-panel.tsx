import {
  type Accessor,
  createMemo,
  createSignal,
  type ParentProps,
  createContext,
  onMount,
  useContext,
} from "solid-js";

import type {
  SidePanelNavigationEntry,
  SidePanelPageDefinition,
  SidePanelPageState,
} from "../types/side-panel-page";
import {
  createSidePanelStore,
  readStoredSidePanelWidth,
} from "./side-panel-store";

export type SidePanelContextValue = {
  isOpen: Accessor<boolean>;
  isClosing: Accessor<boolean>;
  currentEntry: Accessor<SidePanelNavigationEntry | null>;
  navigationStack: Accessor<SidePanelNavigationEntry[]>;
  searchText: Accessor<string>;
  panelWidth: Accessor<number>;
  getPageState: (pageId: string) => SidePanelPageState | undefined;
  openPanel: (page: SidePanelPageDefinition) => void;
  closePanel: () => void;
  navigateTo: (
    page: SidePanelPageDefinition,
    opts?: { resetStack?: boolean },
  ) => void;
  goBack: () => void;
  navigateToStackIndex: (index: number) => void;
  onCloseAnimationComplete: () => void;
  setSearchText: (text: string) => void;
  setPanelWidth: (width: number) => void;
};

const SidePanelContext = createContext<SidePanelContextValue>();

export function SidePanelProvider(props: ParentProps) {
  const store = createSidePanelStore();
  const { state } = store;
  const [hasOpenedPanelOnce, setHasOpenedPanelOnce] = createSignal(false);
  const currentEntry = createMemo<SidePanelNavigationEntry | null>(
    () => state.navigationStack.at(-1) ?? null,
  );

  const openPanel: SidePanelContextValue["openPanel"] = (page) => {
    if (state.isOpen || hasOpenedPanelOnce()) {
      setHasOpenedPanelOnce(true);
      store.openPanel(page);
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHasOpenedPanelOnce(true);
        store.openPanel(page);
      });
    });
  };

  const value: SidePanelContextValue = {
    isOpen: () => state.isOpen,
    isClosing: () => state.isClosing,
    currentEntry,
    navigationStack: () => state.navigationStack,
    searchText: () => state.searchText,
    panelWidth: () => state.panelWidth,
    getPageState: (pageId) => state.pageStateById[pageId],
    openPanel,
    closePanel: store.closePanel,
    navigateTo: store.navigateTo,
    goBack: store.goBack,
    navigateToStackIndex: store.navigateToStackIndex,
    onCloseAnimationComplete: store.onCloseAnimationComplete,
    setSearchText: store.setSearchText,
    setPanelWidth: store.setPanelWidth,
  };

  onMount(() => {
    const persistedWidth = readStoredSidePanelWidth();

    if (persistedWidth !== state.panelWidth) {
      store.setPanelWidth(persistedWidth);
    }
  });

  return (
    <SidePanelContext.Provider value={value}>
      {props.children}
    </SidePanelContext.Provider>
  );
}

export function useSidePanel(): SidePanelContextValue {
  const ctx = useContext(SidePanelContext);
  if (ctx === undefined) {
    throw new Error("useSidePanel must be used within a SidePanelProvider");
  }
  return ctx;
}
