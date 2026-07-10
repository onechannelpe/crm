import type {
  Axis,
  BoundingBox,
  DragElastic,
  InertiaOptions,
  PanInfo,
} from "framer-motion";
import type { VariantLabels } from "motion-dom";

import type { VariantType } from "../../../types";
import type { DragControls } from "./use-drag-controls";

export interface ResolvedConstraints {
  x: Partial<Axis>;
  y: Partial<Axis>;
}

export interface DragHandlers {
  onDragStart?: (event: PointerEvent, info: PanInfo) => void;
  onDragEnd?: (event: PointerEvent, info: PanInfo) => void;
  onDrag?: (event: PointerEvent, info: PanInfo) => void;
  onDirectionLock?: (axis: "x" | "y") => void;
  onDragTransitionEnd?: () => void;

  /**
   * HTMLElement constraints are measured before this callback can replace them.
   */
  onMeasureDragConstraints?: (constraints: BoundingBox) => BoundingBox | void;
}

export interface DragProps extends DragHandlers {
  drag?: boolean | "x" | "y";

  /**
   * Returns to its pre-drag position even when `dragConstraints` permits travel.
   */
  dragSnapToOrigin?: boolean;

  dragDirectionLock?: boolean;

  /**
   * Bypasses the shared drag-axis lock, allowing nested draggable elements.
   */
  dragPropagation?: boolean;

  dragConstraints?: false | Partial<BoundingBox> | HTMLElement;
  dragElastic?: DragElastic;
  dragMomentum?: boolean;
  dragTransition?: InertiaOptions;
  dragListener?: boolean;
  dragControls?: DragControls;
  whileDrag?: VariantLabels | VariantType;
}
