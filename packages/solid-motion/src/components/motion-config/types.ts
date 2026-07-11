import type { Options } from "../../types";

export interface MotionConfigState {
  transition?: Options["transition"];
  /**
   * @deprecated Use `reducedMotion` instead
   */
  reduceMotion?: "user" | "never" | "always";
  reducedMotion?: "user" | "never" | "always";
  /** Apply final animation values without animating this subtree. */
  skipAnimations?: boolean;
  nonce?: string;
  inViewOptions?: Options["inViewOptions"];
}

export type MotionConfigProps = MotionConfigState;
