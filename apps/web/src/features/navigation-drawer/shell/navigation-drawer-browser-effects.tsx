import { createEffect, onMount } from "solid-js";

import { useMobileBreakpoint } from "~/components/ui/layout/resizable-panel/use-mobile-breakpoint";

import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

export function NavigationDrawerBrowserEffects() {
  const { setIsMobile } = useNavigationDrawerState();
  const mobileBreakpointMatches = useMobileBreakpoint();

  onMount(() => {
    createEffect(() => {
      setIsMobile(mobileBreakpointMatches());
    });
  });

  return null;
}
