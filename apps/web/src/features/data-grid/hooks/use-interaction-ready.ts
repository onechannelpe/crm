import { createSignal, onMount } from "solid-js";

export function createDataGridInteractionReady() {
  const [isInteractive, setIsInteractive] = createSignal(false);

  onMount(() => {
    setIsInteractive(true);
  });

  return isInteractive;
}
