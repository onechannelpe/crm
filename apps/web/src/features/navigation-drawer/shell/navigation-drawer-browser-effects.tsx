import { createEffect, onMount } from "solid-js";

import { useIsMobile } from "~/components/ui/layout/responsive/use-is-mobile";

import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

export function NavigationDrawerBrowserEffects() {
  const { setIsMobile } = useNavigationDrawerState();
  const mobileBreakpointMatches = useIsMobile();

  onMount(() => {
    createEffect(() => {
      setIsMobile(mobileBreakpointMatches());
    });
  });

  return null;
}
