import { onCleanup, onMount } from "solid-js";

import { useHotkey } from "~/lib/hotkey/use-hotkey";

interface UseDismissibleLayerOptions {
  enabled: () => boolean;
  onDismiss: () => void;
  getContainer: () => HTMLElement | undefined;
}

export function useDismissibleLayer(options: UseDismissibleLayerOptions) {
  const handlePointerDown = (event: PointerEvent) => {
    const container = options.getContainer();
    const target = event.target;
    if (!options.enabled() || !container || !(target instanceof Node)) return;
    if (!container.contains(target)) {
      options.onDismiss();
    }
  };

  // Dismiss on Escape even when focus is inside the layer (e.g. a search input).
  useHotkey("Escape", () => options.onDismiss(), {
    enabled: options.enabled,
    allowInInputs: true,
  });

  onMount(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() => {
      document.removeEventListener("pointerdown", handlePointerDown);
    });
  });
}
