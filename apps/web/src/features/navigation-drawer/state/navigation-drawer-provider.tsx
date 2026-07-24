import { createContext, type ParentProps, useContext } from "solid-js";

import { readNavigationDrawerExpandedFromCookie } from "./navigation-drawer-expanded";
import {
  createNavigationDrawerStore,
  type NavigationDrawerStateValue,
} from "./navigation-drawer-store";
import { readNavigationDrawerWidthFromCookie } from "./navigation-drawer-width";

const NavigationDrawerStateContext =
  createContext<NavigationDrawerStateValue>();

export function NavigationDrawerStateProvider(props: ParentProps) {
  const value = createNavigationDrawerStore({
    initialWidth: readNavigationDrawerWidthFromCookie(),
    initialExpanded: readNavigationDrawerExpandedFromCookie() ?? true,
  });

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
