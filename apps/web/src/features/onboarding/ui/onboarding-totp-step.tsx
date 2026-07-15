import { Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { RecoveryCodesPanel } from "~/features/auth/security/recovery-codes-panel";
import { OtpSlotInput } from "~/features/auth/ui/otp-slot-input";

import { OnboardingStepAnimatedItem } from "./onboarding-step-animated-item";
import { OnboardingStepHeading } from "./onboarding-step-heading";

import styles from "./onboarding-page.module.css";

interface TotpEnrollment {
  otpauthUri: string;
  qrCodeDataUrl: string;
}

interface OnboardingTotpStepProps {
  enrollment: TotpEnrollment | null;
  loading: boolean;
  code: string;
  recoveryCodes: string[];
  finishing: boolean;
  onCodeInput: (value: string) => void;
  onVerify: () => void;
  onComplete: () => void;
}

export function OnboardingTotpStep(props: OnboardingTotpStepProps) {
  const verified = () => props.recoveryCodes.length > 0;

  return (
    <>
      <OnboardingStepHeading
        title="App de autenticación"
        subtitle="Escanea el código con tu app y confirma el código de 6 dígitos."
      />

      <OnboardingStepAnimatedItem index={2}>
        <div class={styles.totpStack}>
          <Show
            when={props.enrollment}
            fallback={
              <Show when={props.loading}>
                <p class={styles.statusText}>Generando código QR...</p>
              </Show>
            }
          >
            {(enrollment) => (
              <Show
                when={!verified()}
                fallback={<RecoveryCodesPanel codes={props.recoveryCodes} />}
              >
                <div class={styles.totpInline}>
                  <div class={styles.qrCenter}>
                    <img
                      src={enrollment().qrCodeDataUrl}
                      alt="Código QR para autenticación"
                      class={styles.qrCode}
                    />
                  </div>
                  <details class={styles.secretDetails}>
                    <summary>¿No puedes escanear el código?</summary>
                    <div class={styles.secretKeyBlock}>
                      <span class={styles.secretKeyLabel}>
                        Ingresa esta clave en tu app
                      </span>
                      <span class={styles.secretKeyText}>
                        {new URL(enrollment().otpauthUri).searchParams.get(
                          "secret",
                        )}
                      </span>
                    </div>
                  </details>
                  <OtpSlotInput
                    value={props.code}
                    disabled={props.loading}
                    onValueChange={props.onCodeInput}
                  />
                </div>
              </Show>
            )}
          </Show>
        </div>
      </OnboardingStepAnimatedItem>

      <OnboardingStepAnimatedItem index={3} class={styles.actionBlock}>
        <Show
          when={verified()}
          fallback={
            <Button
              class={styles.primaryButton}
              disabled={props.loading || props.code.length < 6}
              loading={props.loading}
              onClick={props.onVerify}
            >
              Verificar
            </Button>
          }
        >
          <Button
            class={styles.primaryButton}
            loading={props.finishing}
            onClick={props.onComplete}
          >
            Finalizar
          </Button>
        </Show>
      </OnboardingStepAnimatedItem>
    </>
  );
}
