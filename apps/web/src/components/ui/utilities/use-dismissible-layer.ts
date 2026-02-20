import { onCleanup, onMount } from "solid-js";

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

  const handleEscape = (event: KeyboardEvent) => {
    if (!options.enabled()) return;
    if (event.key === "Escape") {
      options.onDismiss();
    }
  };

  onMount(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    onCleanup(() => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    });
  });
}
