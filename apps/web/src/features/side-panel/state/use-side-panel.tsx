import {
  type Accessor,
  type ParentProps,
  createContext,
  onMount,
  useContext,
} from "solid-js";

import {
  selectCurrentEntry,
  selectCurrentFrame,
  selectNavigationStack,
} from "../core/selectors";
import type {
  SidePanelNavigationEntry,
  SidePanelPageDefinition,
} from "../types/side-panel-page";
import { createSidePanelStore, readStoredSidePanelWidth } from "./store";

export type SidePanelContextValue = {
  isOpen: Accessor<boolean>;
  isClosing: Accessor<boolean>;
  currentFrame: Accessor<SidePanelPageDefinition | null>;
  currentEntry: Accessor<SidePanelNavigationEntry | null>;
  navigationStack: Accessor<SidePanelNavigationEntry[]>;
  searchText: Accessor<string>;
  panelWidth: Accessor<number>;
  updatePageState: (
    pageId: string,
    updater: (state: SidePanelPageDefinition["state"]) => SidePanelPageDefinition["state"],
  ) => void;
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
  const currentFrame: Accessor<SidePanelPageDefinition | null> = () =>
    selectCurrentFrame(state);
  const currentEntry: Accessor<SidePanelNavigationEntry | null> = () =>
    selectCurrentEntry(state);
  const navigationStack: Accessor<SidePanelNavigationEntry[]> = () =>
    selectNavigationStack(state);

  const value: SidePanelContextValue = {
    isOpen: () => state.isOpen,
    isClosing: () => state.isClosing,
    currentFrame,
    currentEntry,
    navigationStack,
    searchText: () => state.searchText,
    panelWidth: () => state.panelWidth,
    updatePageState: store.updatePageState,
    openPanel: store.openPanel,
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
