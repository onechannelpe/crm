import type { Box } from "framer-motion";

export interface LayoutLifecycles {
  onBeforeLayoutMeasure?: (box: Box) => void;

  onLayoutMeasure?: (box: Box, prevBox: Box) => void;

  onLayoutAnimationStart?: () => void;

  onLayoutAnimationComplete?: () => void;
}

export interface LayoutOptions extends LayoutLifecycles {
  layout?: boolean | "position" | "size" | "preserve-aspect";

  layoutId?: string;
  layoutScroll?: boolean;
  layoutRoot?: boolean;
  "data-framer-portal-id"?: string;
  crossfade?: boolean;
  layoutDependency?: any;
}
