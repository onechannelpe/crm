import { createEffect } from "solid-js";

import { useNavigationDrawerState } from "../state/navigation-drawer-provider";
import { NAVIGATION_DRAWER_WIDTH_VAR } from "../state/navigation-drawer-width";

export function NavigationDrawerWidthEffect() {
  const { width } = useNavigationDrawerState();

  createEffect(() => {
    document.documentElement.style.setProperty(
      NAVIGATION_DRAWER_WIDTH_VAR,
      `${width()}px`,
    );
  });

  return null;
}
