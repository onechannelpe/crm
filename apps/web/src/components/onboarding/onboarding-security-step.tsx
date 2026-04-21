import { Show } from "solid-js";

import styles from "./onboarding-security-step.module.css";

interface OnboardingSecurityStepProps {
  hasPasskey: boolean;
  totpEnabled: boolean;
  securityRequired: boolean;
  onSelectPasskey: () => void;
  onSelectTotp: () => void;
}

export function OnboardingSecurityStep(props: OnboardingSecurityStepProps) {
  return (
    <section class={styles.stepStack}>
      <p class={styles.helperText}>
        <Show
          when={props.securityRequired}
          fallback="Configura un método para proteger mejor tu cuenta."
        >
          Elige cómo confirmarás tu identidad al iniciar sesión.
        </Show>
      </p>
      <div class={styles.choiceGrid}>
        <button
          type="button"
          class={styles.choiceCard}
          aria-pressed={props.hasPasskey}
          onClick={props.onSelectPasskey}
        >
          <div class={styles.choiceCardHeader}>
            <span class={styles.choiceTitle}>Clave de acceso</span>
            <Show when={props.hasPasskey}>
              <span class={styles.configuredBadge}>Configurada</span>
            </Show>
          </div>
          <span class={styles.choiceDescription}>
            Huella dactilar, Face ID o clave de seguridad.
          </span>
        </button>
        <button
          type="button"
          class={styles.choiceCard}
          aria-pressed={props.totpEnabled}
          onClick={props.onSelectTotp}
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
