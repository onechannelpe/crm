import type { EventInfo, VariantLabels } from "motion-dom";

import type { VariantType } from "../../../types";

export type HoverEvent = (event: MouseEvent, info: EventInfo) => void;

export interface HoverProps {
  whileHover?: VariantLabels | VariantType;
  onHoverStart?: HoverEvent;
  onHoverEnd?: HoverEvent;
}
