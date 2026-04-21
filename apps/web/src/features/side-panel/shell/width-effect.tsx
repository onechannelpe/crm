import { useCssVariableEffect } from "~/components/ui/layout/resizable-panel/use-css-variable-effect";

import { SIDE_PANEL_WIDTH_VAR } from "../state/side-panel-width";
import { useSidePanel } from "../state/use-side-panel";

export function WidthEffect() {
  const { panelWidth } = useSidePanel();
  useCssVariableEffect(SIDE_PANEL_WIDTH_VAR, () => `${panelWidth()}px`);

  return null;
}
