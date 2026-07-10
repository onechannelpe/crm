import { addScaleCorrector, frame, globalProjectionState } from "motion-dom";

import type { MotionState } from "../../state/motion-state";
import type { Options } from "../../types";
import { isHidden } from "../../utils/is-hidden";
import { Feature } from "../feature";
import { defaultScaleCorrector } from "./config";

const isDef = <T>(val: T): val is NonNullable<T> =>
  val !== undefined && val !== null;

let hasLayoutUpdate = false;
export class LayoutFeature extends Feature {
  static key = "layout" as const;
  private hasMountSettled = false;

  constructor(state: MotionState) {
    super(state);
    addScaleCorrector(defaultScaleCorrector);
    state.registerLayoutLifecycle({
      getSnapshot: this.getSnapshot.bind(this),
      didUpdate: this.didUpdate.bind(this),
    });
  }

  private updatePrevLead(
    projection: NonNullable<typeof this.state.visualElement.projection>,
  ) {
    const stack = projection.getStack();
    if (stack?.prevLead && !stack.prevLead.snapshot) {
      stack.prevLead.willUpdate();
      hasLayoutUpdate = true;
    }
  }

  didUpdate() {
    if (!hasLayoutUpdate) return;
    if (
      this.state.options.layout ||
      this.state.options.layoutId ||
      this.state.options.drag
    ) {
      hasLayoutUpdate = false;
      this.state.visualElement.projection?.root?.didUpdate();
    }
  }

  mount() {
    const options = this.state.options;
    const layoutGroup = this.state.options.layoutGroup;
    if (options.layout || options.layoutId) {
      const projection = this.state.visualElement.projection;
      if (options.layoutId) {
        const isPresent = !isHidden(this.state.element as HTMLElement);
        projection.isPresent = isPresent;
        if (isPresent) {
          projection.promote();
        } else {
          projection.relegate();
        }
        this.updatePrevLead(projection);
      }
      layoutGroup?.group?.add(projection);
      globalProjectionState.hasEverUpdated = true;
    }
    this.didUpdate();

    // Wait one frame so projection parents and ancestor transforms settle before
    // measuring snapshots. Measuring earlier produces false layout deltas.
    frame.postRender(() => {
      this.hasMountSettled = true;
    });
  }

  unmount() {
    const layoutGroup = this.state.options.layoutGroup;
    const projection = this.state.visualElement.projection;

    if (projection) {
      if (
        layoutGroup?.group &&
        (this.state.options.layout || this.state.options.layoutId)
      ) {
        layoutGroup.group.remove(projection);
      }
      // Removing a layoutId member changes its projection stack.
      if (this.state.options.layoutId) {
        hasLayoutUpdate = true;
      }
      this.didUpdate();
    }
  }

  getSnapshot(newOptions: Options, isPresent?: boolean): void {
    const projection = this.state.visualElement.projection;
    const { drag, layoutDependency, layout, layoutId } = newOptions;
    if (!projection || (!layout && !layoutId && !drag)) {
      return;
    }

    // Snapshot capture waits for the post-mount projection tree to settle.
    if (!this.hasMountSettled) {
      return;
    }

    hasLayoutUpdate = true;
    const prevProps = this.state.options;

    if (
      drag ||
      prevProps.layoutDependency !== layoutDependency ||
      layoutDependency === undefined ||
      (isDef(isPresent) && projection.isPresent !== isPresent)
    ) {
      projection.willUpdate();
    }

    if (isDef(isPresent) && isPresent !== projection.isPresent) {
      projection.isPresent = isPresent;
      if (isPresent) {
        projection.promote();
        this.updatePrevLead(projection);
      } else {
        projection.relegate();
      }
    }
  }
}
