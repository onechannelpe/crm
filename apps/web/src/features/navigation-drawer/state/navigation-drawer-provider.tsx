import { createContext, type ParentProps, useContext } from "solid-js";

import {
  createNavigationDrawerStore,
  type NavigationDrawerStateValue,
} from "./navigation-drawer-store";

const NavigationDrawerStateContext =
  createContext<NavigationDrawerStateValue>();

export function NavigationDrawerStateProvider(props: ParentProps) {
  const value = createNavigationDrawerStore();

  return (
    <NavigationDrawerStateContext.Provider value={value}>
      {props.children}
    </NavigationDrawerStateContext.Provider>
  );
}

export function useNavigationDrawerState() {
  const context = useContext(NavigationDrawerStateContext);

  if (!context) {
    throw new Error(
      "useNavigationDrawerState must be used within NavigationDrawerStateProvider",
    );
  }

  return context;
}
