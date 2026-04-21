import { createEffect, onMount } from "solid-js";

import { useMobileBreakpoint } from "~/components/ui/layout/resizable-panel/use-mobile-breakpoint";

import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

export function NavigationDrawerBrowserEffects() {
  const { expanded, width, isMobile, setIsMobile } = useNavigationDrawerState();
  const mobileBreakpointMatches = useMobileBreakpoint();

  onMount(() => {
    createEffect(() => {
      setIsMobile(mobileBreakpointMatches());
    });

    createEffect(() => {
      document.documentElement.style.setProperty(
        "--nav-drawer-current-width",
        isMobile() ? "0px" : expanded() ? `${width()}px` : "40px",
      );
    });
  });

  return null;
}
