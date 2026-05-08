import { createSignal, onCleanup, onMount } from "solid-js";

import {
  evaluateWebGlPolicy,
  type WebGlPolicyDecision,
} from "./visual-runtime-policy";

const PESSIMISTIC_INITIAL_DECISION: WebGlPolicyDecision = {
  allowed: false,
  reason: "no-webgl-support",
  reducedMotion: false,
};

export function useWebGlPolicy() {
  const [decision, setDecision] = createSignal<WebGlPolicyDecision>(
    PESSIMISTIC_INITIAL_DECISION,
  );

  onMount(() => {
    setDecision(evaluateWebGlPolicy());

    if (!("matchMedia" in window)) {
      return;
    }

    const mediaQueryList = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const handleMotionChange = () => setDecision(evaluateWebGlPolicy());

    mediaQueryList.addEventListener("change", handleMotionChange);
    onCleanup(() => {
      mediaQueryList.removeEventListener("change", handleMotionChange);
    });
  });

  return decision;
}
