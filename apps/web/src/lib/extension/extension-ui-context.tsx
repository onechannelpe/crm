import { createContext, createSignal, useContext } from "solid-js";
import type { ParentProps } from "solid-js";

interface ExtensionUIContextValue {
  sidebarOpen: () => boolean;
  setSidebarOpen: (open: boolean) => void;
}

const ExtensionUIContext = createContext<ExtensionUIContextValue>();

export function ExtensionUIProvider(props: ParentProps) {
  const [sidebarOpen, setSidebarOpen] = createSignal(false);

  return (
    <ExtensionUIContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {props.children}
    </ExtensionUIContext.Provider>
  );
}

export function useExtensionUI() {
  const context = useContext(ExtensionUIContext);
  if (!context) {
    throw new Error("useExtensionUI must be used within ExtensionUIProvider");
  }
  return context;
}

