import { useCssVariableEffect } from "~/components/ui/layout/resizable-panel/use-css-variable-effect";

import { useNavigationDrawerState } from "../state/navigation-drawer-provider";
import { NAVIGATION_DRAWER_WIDTH_VAR } from "../state/navigation-drawer-width";

export function NavigationDrawerWidthEffect() {
  const { width } = useNavigationDrawerState();
  useCssVariableEffect(NAVIGATION_DRAWER_WIDTH_VAR, () => `${width()}px`);

  return null;
}
