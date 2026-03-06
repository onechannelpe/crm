import { Show } from "solid-js";

import type { CurrentUser } from "~/actions/auth";
import ShieldCheck from "~/components/icons/shield-check";

import styles from "~/routes/onboarding-page.module.css";

interface OnboardingSecurityStepProps {
  currentUser: Pick<CurrentUser, "strongAuthRequired">;
  onSelectMethod: (value: "passkey" | "totp") => void;
}

export function OnboardingSecurityStep(props: OnboardingSecurityStepProps) {
  return (
    <section class={styles.stepStack}>
      <div class={styles.stepIntro}>
        <div class={styles.stepIntroIcon}>
          <ShieldCheck size={16} />
        </div>
        <div class={styles.stepIntroCopy}>
          <p class={styles.kicker}>Seguridad</p>
          <h3 class={styles.sectionTitle}>Choose a method</h3>
          <Show when={props.currentUser.strongAuthRequired}>
            <p class={styles.sectionDescription}>Required to continue.</p>
          </Show>
        </div>
      </div>

      <div class={styles.choiceGrid}>
        <button
          type="button"
          class={styles.choiceCard}
          onClick={() => props.onSelectMethod("passkey")}
        >
          <span class={styles.choiceTitle}>Passkey</span>
          <span class={styles.choiceDescription}>
            Sign in with your device.
          </span>
        </button>
        <button
          type="button"
          class={styles.choiceCard}
          onClick={() => props.onSelectMethod("totp")}
        >
          <span class={styles.choiceTitle}>Authenticator app</span>
          <span class={styles.choiceDescription}>Use a 6-digit code.</span>
        </button>
      </div>
    </section>
  );
}
