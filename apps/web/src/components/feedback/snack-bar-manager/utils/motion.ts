import type { JSX } from "solid-js";

interface AnimatePresenceProps {
  children: JSX.Element;
}

interface MotionDivProps {
  children?: JSX.Element;
  class?: string;
  style?: JSX.CSSProperties;
}

interface ProgressAnimationOptions {
  durationMs: number;
  onComplete?: () => void;
}

export function AnimatePresence(props: AnimatePresenceProps) {
  return props.children;
}

export const motion = {
  div(props: MotionDivProps) {
    return props.children ?? null;
  },
};

export function useProgressAnimation(_options: ProgressAnimationOptions) {
  return {
    pause() {
      return;
    },
    play() {
      return;
    },
  };
}
