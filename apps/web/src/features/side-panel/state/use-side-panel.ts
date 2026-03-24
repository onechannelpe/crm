import { type Accessor, type ParentProps, createContext, useContext } from "solid-js";
import {
  type SidePanelPage,
  type SidePanelPageInfo,
  createSidePanelStore,
} from "./side-panel-store";

export type SidePanelContextValue = {
  // state accessors
  isOpen: Accessor<boolean>;
  isClosing: Accessor<boolean>;
  currentPage: Accessor<SidePanelPage | null>;
  navigationStack: Accessor<SidePanelPage[]>;
  pageInfo: Accessor<SidePanelPageInfo | null>;
  searchText: Accessor<string>;
  panelWidth: Accessor<number>;

  // actions
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

  const value: SidePanelContextValue = {
    isOpen: () => state.isOpen,
    isClosing: () => state.isClosing,
    currentPage: () => state.currentPage,
    navigationStack: () => state.navigationStack,
    pageInfo: () => state.pageInfo,
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
