import {
  type Accessor,
  createMemo,
  type ParentProps,
  createContext,
  useContext,
} from "solid-js";

import {
  createSidePanelStore,
} from "./side-panel-store";
import type { SidePanelPage } from "../types/side-panel-page";

export type SidePanelContextValue = {
  isOpen: Accessor<boolean>;
  isClosing: Accessor<boolean>;
  currentPage: Accessor<SidePanelPage | null>;
  navigationStack: Accessor<SidePanelPage[]>;
  searchText: Accessor<string>;
  panelWidth: Accessor<number>;
  openPanel: (page: SidePanelPage) => void;
  closePanel: () => void;
  navigateTo: (page: SidePanelPage, opts?: { resetStack?: boolean }) => void;
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
  const currentPage = createMemo<SidePanelPage | null>(
    () => state.navigationStack.at(-1) ?? null,
  );

  const value: SidePanelContextValue = {
    isOpen: () => state.isOpen,
    isClosing: () => state.isClosing,
    currentPage,
    navigationStack: () => state.navigationStack,
    searchText: () => state.searchText,
    panelWidth: () => state.panelWidth,
    openPanel: store.openPanel,
    closePanel: store.closePanel,
    navigateTo: store.navigateTo,
    goBack: store.goBack,
    navigateToStackIndex: store.navigateToStackIndex,
    onCloseAnimationComplete: store.onCloseAnimationComplete,
    setSearchText: store.setSearchText,
    setPanelWidth: store.setPanelWidth,
  };

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
