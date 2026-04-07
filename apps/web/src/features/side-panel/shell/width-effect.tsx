import { createEffect, onMount } from "solid-js";

import { useSidePanel } from "../state/use-side-panel";

export function WidthEffect() {
  const { panelWidth } = useSidePanel();

  onMount(() => {
    createEffect(() => {
      document.documentElement.style.setProperty(
        "--side-panel-width",
        `${panelWidth()}px`,
      );
    });
  });

  return null;
}
