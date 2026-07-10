import type { IProjectionNode } from "motion-dom";
import { HTMLProjectionNode, addScaleCorrector } from "motion-dom";

import { isSSR } from "../../utils/is";
import { Feature } from "../feature";
import { isHTMLElement } from "../gestures/drag/utils/is";
import { defaultScaleCorrector } from "./config";
import { getClosestProjectingNode } from "./utils";

export class ProjectionFeature extends Feature {
  static key = "projection" as const;
  private projection: IProjectionNode | undefined;
  constructor(state) {
    super(state);
    addScaleCorrector(defaultScaleCorrector);
    if (!isSSR) {
      this.initProjection();
    }
  }

  initProjection() {
    const options = this.state.options;
    this.state.visualElement.projection = new HTMLProjectionNode(
      this.state.visualElement.latestValues,
      options["data-framer-portal-id"]
        ? undefined
        : getClosestProjectingNode(this.state.visualElement.parent),
    );
    this.projection = this.state.visualElement.projection;
    this.projection.isPresent = true;
    this.setOptions();
  }

  setOptions() {
    const options = this.state.options;
    const { layoutId, layout, drag = false, dragConstraints = false } = options;
    this.projection?.setOptions({
      layout,
      layoutId,
      alwaysMeasureLayout:
        Boolean(layoutId) ||
        Boolean(drag) ||
        (dragConstraints && isHTMLElement(dragConstraints)),
      visualElement: this.state.visualElement,
      animationType:
        typeof options.layout === "string" ? options.layout : "both",
      layoutRoot: options.layoutRoot,
      layoutScroll: options.layoutScroll,
      crossfade: options.crossfade,
      onExitComplete: () => {
        if (
          !this.projection?.isPresent &&
          this.state.options.layoutId &&
          !this.state.isExiting
        ) {
          // Notify after projection updates finish: their microtask batcher drops
          // re-entrant updates and would lose this exit completion.
          queueMicrotask(() => {
            this.state.options.presenceContext?.onMotionExitComplete?.(
              this.state.presenceContainer,
              this.state,
            );
          });
        }
      },
    });
  }

  update() {
    this.setOptions();
  }

  mount() {
    this.projection?.mount(this.state.element);
  }
}
