import { ResponsiveImage } from "@crm/images";
import { type JSX, Show } from "solid-js";

import logo from "~/assets/images/logo/logo.webp?responsive";

import styles from "./onboarding-shell.module.css";

interface OnboardingShellProps {
  onBack?: () => void;
  centered?: boolean;
  children: JSX.Element;
}

export function OnboardingShell(props: OnboardingShellProps) {
  return (
    <div class={styles.background}>
      <header class={styles.header}>
        <div class={styles.headerLeft}>
          <Show when={props.onBack}>
            {(onBack) => (
              <button
                type="button"
                class={styles.backButton}
                aria-label="Volver"
                onClick={() => onBack()()}
              >
                <ChevronLeftIcon />
              </button>
            )}
          </Show>
        </div>
        <div class={styles.headerCenter}>
          <ResponsiveImage
            sources={logo}
            alt="Culqi360"
            width="24"
            height="24"
            class={styles.headerLogo}
          />
        </div>
        <div class={styles.headerRight} />
      </header>

      <div
        class={styles.stepPage}
        classList={{ [styles.stepPageCentered]: props.centered }}
      >
        {props.children}
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6l6 6" />
    </svg>
  );
}
