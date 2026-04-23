import { onCleanup, onMount } from "solid-js";

import { useHotkey } from "~/lib/hotkey/use-hotkey";

interface UseDismissibleLayerOptions {
  enabled: () => boolean;
  onDismiss: () => void;
  getContainer: () => HTMLElement | undefined;
  getAdditionalContainers?: () => Array<HTMLElement | undefined>;
}

export function useDismissibleLayer(options: UseDismissibleLayerOptions) {
  const handlePointerDown = (event: PointerEvent) => {
    const container = options.getContainer();
    const additional = options.getAdditionalContainers?.() ?? [];
    const target = event.target;
    if (!options.enabled() || !container || !(target instanceof Node)) return;
    const insidePrimary = container.contains(target);
    const insideAdditional = additional.some(
      (candidate) => candidate?.contains(target) === true,
    );
    if (!insidePrimary && !insideAdditional) {
      options.onDismiss();
    }
  };

  // Dismiss on Escape even when focus is inside the layer (e.g. a search input).
  useHotkey("Escape", () => options.onDismiss(), {
    enabled: options.enabled,
    allowInInputs: true,
  });

  onMount(() => {
    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() => {
      document.removeEventListener("pointerdown", handlePointerDown);
    });
  });
}
