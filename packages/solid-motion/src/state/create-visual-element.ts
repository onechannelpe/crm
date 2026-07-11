import { HTMLVisualElement, SVGVisualElement } from "motion-dom";

import type { AsTag } from "../types";
import { isSVGElement } from "./utils";

export function createVisualElement(Component: AsTag, options: any) {
  return isSVGElement(Component as any)
    ? new SVGVisualElement(options)
    : new HTMLVisualElement(options);
}
