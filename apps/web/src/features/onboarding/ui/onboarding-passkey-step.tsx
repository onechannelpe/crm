import { Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { RecoveryCodesPanel } from "~/features/auth/security/recovery-codes-panel";

import { OnboardingStepAnimatedItem } from "./onboarding-step-animated-item";
import { OnboardingStepHeading } from "./onboarding-step-heading";

import styles from "./onboarding-page.module.css";

export type PasskeyPhase = "idle" | "device" | "server";

interface OnboardingPasskeyStepProps {
  phase: PasskeyPhase;
  recoveryCodes: string[];
  finishing: boolean;
  onSetup: () => void;
  onComplete: () => void;
}

export function OnboardingPasskeyStep(props: OnboardingPasskeyStepProps) {
  const enrolled = () => props.recoveryCodes.length > 0;

  return (
    <Show
      when={enrolled()}
      fallback={
        <>
          <OnboardingStepHeading
            title="Clave de acceso"
            subtitle="Usa la huella dactilar, Face ID o una clave de seguridad de este dispositivo."
          />

          <OnboardingStepAnimatedItem index={2} class={styles.actionBlock}>
            <Show when={props.phase === "device"}>
              <p class={styles.statusText}>Esperando tu dispositivo...</p>
            </Show>
            <Show when={props.phase === "server"}>
              <p class={styles.statusText}>Guardando tu registro...</p>
            </Show>
            <Show when={props.phase === "idle"}>
              <Button class={styles.primaryButton} onClick={props.onSetup}>
                Configurar clave de acceso
              </Button>
            </Show>
          </OnboardingStepAnimatedItem>
        </>
      }
    >
      <OnboardingStepHeading
        title="Guarda tus códigos de recuperación"
        subtitle="Úsalos para entrar si pierdes el acceso a tu clave. Guárdalos en un lugar seguro."
      />

      <OnboardingStepAnimatedItem index={2}>
        <RecoveryCodesPanel codes={props.recoveryCodes} />
      </OnboardingStepAnimatedItem>

      <OnboardingStepAnimatedItem index={3} class={styles.actionBlock}>
        <Button
          class={styles.primaryButton}
          loading={props.finishing}
          onClick={props.onComplete}
        >
          Finalizar
        </Button>
      </OnboardingStepAnimatedItem>
    </Show>
  );
}
