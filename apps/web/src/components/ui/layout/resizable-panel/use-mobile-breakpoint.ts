import { createSignal, onCleanup, onMount } from "solid-js";

export function useMobileBreakpoint(maxWidthPx = 768) {
  const [isMobile, setIsMobile] = createSignal(false);

  onMount(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    setIsMobile(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    onCleanup(() => mediaQuery.removeEventListener("change", handleChange));
  });

  return isMobile;
}
