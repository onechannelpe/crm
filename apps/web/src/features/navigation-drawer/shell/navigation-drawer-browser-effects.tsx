import { createEffect, onMount } from "solid-js";

import { useIsMobile } from "~/components/ui/layout/responsive/use-is-mobile";

import { readNavigationDrawerExpandedFromCookie } from "../state/navigation-drawer-expanded";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

export function NavigationDrawerBrowserEffects() {
  const { setIsMobile, setExpanded } = useNavigationDrawerState();
  const mobileBreakpointMatches = useIsMobile();

  onMount(() => {
    if (
      readNavigationDrawerExpandedFromCookie() === null &&
      mobileBreakpointMatches()
    ) {
      setExpanded(false);
    }

    createEffect(() => {
      setIsMobile(mobileBreakpointMatches());
    });
  });

  return null;
}
