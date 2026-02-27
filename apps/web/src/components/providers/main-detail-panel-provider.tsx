import {
  createContext,
  createSignal,
  type JSX,
  type ParentProps,
  useContext,
} from "solid-js";

interface MainDetailPanelContextValue {
  panel: () => JSX.Element | null;
  setPanel: (next: JSX.Element | null) => void;
  clearPanel: () => void;
}

const MainDetailPanelContext = createContext<MainDetailPanelContextValue>();

export function MainDetailPanelProvider(props: ParentProps) {
  const [panel, setPanel] = createSignal<JSX.Element | null>(null);

  return (
    <MainDetailPanelContext.Provider
      value={{
        panel,
        setPanel,
        clearPanel: () => setPanel(null),
      }}
    >
      {props.children}
    </MainDetailPanelContext.Provider>
  );
}

export function useMainDetailPanel() {
  const context = useContext(MainDetailPanelContext);
  if (!context) {
    throw new Error(
      "useMainDetailPanel must be used within MainDetailPanelProvider",
    );
  }
  return context;
}
