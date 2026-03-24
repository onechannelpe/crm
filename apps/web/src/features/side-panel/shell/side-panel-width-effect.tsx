import { createEffect } from "solid-js";
import { useSidePanel } from "../state/use-side-panel";

export function SidePanelWidthEffect() {
  const { panelWidth } = useSidePanel();

  createEffect(() => {
    document.documentElement.style.setProperty(
      "--side-panel-width",
      `${panelWidth()}px`,
    );
  });

  return null;
}
