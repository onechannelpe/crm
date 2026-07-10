import { noop } from "motion-utils";

import { Feature } from "../../feature";
import { VisualElementDragControls } from "./VisualElementDragControls";

export class DragGesture extends Feature {
  static key = "drag" as const;

  controls: VisualElementDragControls;

  removeGroupControls: Function = noop;
  removeListeners: Function = noop;

  constructor(state) {
    super(state);
    this.controls = new VisualElementDragControls(state);
  }

  mount() {
    const { dragControls } = this.state.options;

    if (dragControls) {
      this.removeGroupControls = dragControls.subscribe(this.controls);
    }
    this.removeListeners = this.controls.addListeners() || noop;
  }

  unmount() {
    this.removeGroupControls();
    this.removeListeners();
  }
}
