import { Show } from "solid-js";

import { OnboardingSkipButton } from "./onboarding-skip-button";
import { OnboardingStepAnimatedItem } from "./onboarding-step-animated-item";
import { OnboardingStepHeading } from "./onboarding-step-heading";

import styles from "./onboarding-security-step.module.css";

interface OnboardingSecurityStepProps {
  hasPasskey: boolean;
  totpEnabled: boolean;
  securityRequired: boolean;
  finishing: boolean;
  onSelectPasskey: () => void;
  onSelectTotp: () => void;
  onFinishWithoutSecurity: () => void;
}

export function OnboardingSecurityStep(props: OnboardingSecurityStepProps) {
  return (
    <>
      <OnboardingStepHeading
        title="Protege tu cuenta"
        subtitle={
          props.securityRequired
            ? "Elige cómo confirmarás tu identidad al iniciar sesión."
            : "Añade una segunda verificación. Puedes finalizar ahora y configurarla más adelante."
        }
      />

      <OnboardingStepAnimatedItem index={2}>
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
      </OnboardingStepAnimatedItem>

      <Show when={!props.securityRequired}>
        <OnboardingStepAnimatedItem index={3} class={styles.actionBlock}>
          <OnboardingSkipButton
            label="Finalizar sin 2FA"
            disabled={props.finishing}
            onClick={props.onFinishWithoutSecurity}
          />
        </OnboardingStepAnimatedItem>
      </Show>
    </>
  );
}
