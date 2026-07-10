import type { MotionState } from "../state/motion-state";

export type FeatureKey =
  | "animation"
  | "projection"
  | "layout"
  | "hover"
  | "press"
  | "focus"
  | "drag"
  | "pan"
  | "inView";

export class Feature {
  static key: FeatureKey;

  isMount: boolean;

  state: MotionState;

  constructor(state: MotionState) {
    this.state = state;
  }

  mount() {}

  unmount() {}

  update() {}
}
