import { Show } from "solid-js";

import styles from "~/routes/onboarding-page.module.css";

interface OnboardingSecurityStepProps {
  hasPasskey: boolean;
  totpEnabled: boolean;
  onSelectMethod: (value: "passkey" | "totp") => void;
}

export function OnboardingSecurityStep(props: OnboardingSecurityStepProps) {
  return (
    <section class={styles.stepStack}>
      <p class={styles.helperText}>
        Elige cómo confirmarás tu identidad al iniciar sesión.
      </p>
      <div class={styles.choiceGrid}>
        <button
          type="button"
          class={styles.choiceCard}
          aria-pressed={props.hasPasskey}
          onClick={() => props.onSelectMethod("passkey")}
        >
          <div class={styles.choiceCardHeader}>
            <span class={styles.choiceTitle}>Clave de acceso</span>
            <Show when={props.hasPasskey}>
              <span class={styles.configuredBadge}>Configurada</span>
            </Show>
          </div>
          <span class={styles.choiceDescription}>
            Entra con tu dispositivo.
          </span>
        </button>
        <button
          type="button"
          class={styles.choiceCard}
          aria-pressed={props.totpEnabled}
          onClick={() => props.onSelectMethod("totp")}
        >
          <div class={styles.choiceCardHeader}>
            <span class={styles.choiceTitle}>App de autenticación</span>
            <Show when={props.totpEnabled}>
              <span class={styles.configuredBadge}>Configurada</span>
            </Show>
          </div>
          <span class={styles.choiceDescription}>
            Códigos temporales de 6 dígitos.
          </span>
        </button>
      </div>
    </section>
  );
}
