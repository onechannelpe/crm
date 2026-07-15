import { createSignal, onCleanup, onMount } from "solid-js";

import { Animated } from "~/components/ui/animation/animated";

import styles from "./onboarding-page.module.css";

const STEP_OPACITIES = [1, 0.4, 0.12];
const VISIBLE_STEP_COUNT = STEP_OPACITIES.length;
const STEP_HEIGHT_PX = 28;
const CONTAINER_HEIGHT_PX = STEP_HEIGHT_PX * VISIBLE_STEP_COUNT;
const MESSAGE_INTERVAL_MS = 1000;
const NORMAL_DURATION_S = 0.3;

interface OnboardingActivationStepsProps {
  messages: string[];
  onComplete?: () => void;
}

export function OnboardingActivationSteps(
  props: OnboardingActivationStepsProps,
) {
  const [activeIndex, setActiveIndex] = createSignal(0);

  onMount(() => {
    let timer: ReturnType<typeof setTimeout>;

    const advance = () => {
      const next = activeIndex() + 1;
      if (next >= props.messages.length) {
        props.onComplete?.();
        return;
      }
      setActiveIndex(next);
      timer = setTimeout(advance, MESSAGE_INTERVAL_MS);
    };

    timer = setTimeout(advance, MESSAGE_INTERVAL_MS);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <div
      class={styles.activationSteps}
      style={{ height: `${CONTAINER_HEIGHT_PX}px` }}
    >
      {props.messages.map((message, index) => {
        const target = () => {
          const offset = index - activeIndex();
          const isVisible = offset >= 0 && offset < VISIBLE_STEP_COUNT;
          return {
            opacity: isVisible ? STEP_OPACITIES[offset] : 0,
            y: offset * STEP_HEIGHT_PX,
          };
        };
        return (
          <Animated
            class={styles.activationStep}
            initial={false}
            animate={target()}
            transition={{ duration: NORMAL_DURATION_S, ease: "ease-in-out" }}
          >
            <span class={styles.activationMessage}>{message}</span>
          </Animated>
        );
      })}
    </div>
  );
}
