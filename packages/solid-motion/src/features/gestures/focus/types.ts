import type { VariantLabels } from "motion-dom";

import type { VariantType } from "../../../types";

export type FocusProps = {
  whileFocus?: VariantLabels | VariantType;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
};
