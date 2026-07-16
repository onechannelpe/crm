import { Show } from "solid-js";

import { OnboardingStepAnimatedItem } from "./onboarding-step-animated-item";

import styles from "./onboarding-page.module.css";

interface OnboardingStepHeadingProps {
  title: string;
  subtitle?: string;
}

export function OnboardingStepHeading(props: OnboardingStepHeadingProps) {
  return (
    <div class={styles.heading}>
      <OnboardingStepAnimatedItem index={0}>
        <h1 class={styles.title}>{props.title}</h1>
      </OnboardingStepAnimatedItem>
      <Show when={props.subtitle}>
        <OnboardingStepAnimatedItem index={1}>
          <p class={styles.subtitle}>{props.subtitle}</p>
        </OnboardingStepAnimatedItem>
      </Show>
    </div>
  );
}
