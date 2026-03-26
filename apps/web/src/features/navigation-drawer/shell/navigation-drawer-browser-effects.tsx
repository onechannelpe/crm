import { createEffect, onCleanup, onMount } from "solid-js";

import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

const MOBILE_BREAKPOINT = 768;

export function NavigationDrawerBrowserEffects() {
  const { expanded, width, isMobile, setIsMobile } = useNavigationDrawerState();

  onMount(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    onCleanup(() => mediaQuery.removeEventListener("change", handleChange));

    createEffect(() => {
      document.documentElement.style.setProperty(
        "--nav-drawer-current-width",
        isMobile() ? "0px" : expanded() ? `${width()}px` : "40px",
      );
    });
  });

  return null;
}
