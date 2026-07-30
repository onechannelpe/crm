import { useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import {
  acknowledgeRecoveryCodes,
  regenerateRecoveryCodes,
} from "~/actions/auth/recovery-codes.action";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { Button } from "~/components/ui/input/button";
import { actionErrorMessage } from "~/contracts/errors";
import { RecoveryCodesPanel } from "~/features/auth/security/recovery-codes-panel";
import { OnboardingShell } from "~/features/onboarding/ui/onboarding-shell";
import { OnboardingStepHeading } from "~/features/onboarding/ui/onboarding-step-heading";

import styles from "~/features/onboarding/ui/onboarding-page.module.css";

export default function RecoveryCodeSetupPage() {
  const navigate = useNavigate();
  const { enqueueErrorSnackBar } = useSnackBar();
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const [submitting, setSubmitting] = createSignal(false);

  async function regenerate() {
    setSubmitting(true);
    try {
      const result = await regenerateRecoveryCodes();
      setRecoveryCodes(result.recoveryCodes);
    } catch (error: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function acknowledge() {
    setSubmitting(true);
    try {
      const result = await acknowledgeRecoveryCodes();
      navigate(result.redirectTo);
    } catch (error: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell>
      <OnboardingStepHeading
        title="Guarda tus códigos de recuperación"
        subtitle="Necesitas confirmar un nuevo juego de códigos antes de continuar. Los códigos anteriores dejarán de funcionar."
      />

      <div class={styles.actionBlock}>
        <Show
          when={recoveryCodes().length > 0}
          fallback={
            <Button
              type="button"
              class={styles.primaryButton}
              loading={submitting()}
              onClick={() => void regenerate()}
            >
              Generar nuevos códigos
            </Button>
          }
        >
          <RecoveryCodesPanel codes={recoveryCodes()} />
          <Button
            type="button"
            class={styles.primaryButton}
            loading={submitting()}
            onClick={() => void acknowledge()}
          >
            Ya los guardé
          </Button>
        </Show>
      </div>
    </OnboardingShell>
  );
}
