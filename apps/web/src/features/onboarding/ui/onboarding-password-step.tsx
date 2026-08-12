import { Show } from "solid-js";

import { Button } from "~/components/ui/input/button";

import { OnboardingStepAnimatedItem } from "./onboarding-step-animated-item";
import { OnboardingStepHeading } from "./onboarding-step-heading";

import styles from "./onboarding-page.module.css";

const FORM_ID = "onboarding-password-form";
const MIN_LENGTH = 8;

interface OnboardingPasswordStepProps {
  email: string;
  password: string;
  confirmPassword: string;
  submitting: boolean;
  onPasswordInput: (value: string) => void;
  onConfirmPasswordInput: (value: string) => void;
  onSubmit: () => void;
}

export function OnboardingPasswordStep(props: OnboardingPasswordStepProps) {
  const tooShort = () =>
    props.password.length > 0 && props.password.length < MIN_LENGTH;
  const mismatch = () =>
    props.confirmPassword.length > 0 &&
    props.password !== props.confirmPassword;
  const canSubmit = () =>
    props.password.length >= MIN_LENGTH &&
    props.confirmPassword.length >= MIN_LENGTH &&
    props.password === props.confirmPassword;

  return (
    <>
      <OnboardingStepHeading
        title="Crea tu contraseña"
        subtitle="Reemplaza la contraseña temporal antes de configurar tu cuenta."
      />

      <form
        id={FORM_ID}
        class={styles.formContents}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit()) {
            props.onSubmit();
          }
        }}
      >
        <input
          type="email"
          autocomplete="username"
          value={props.email}
          readonly
          class={styles.hiddenUsername}
        />

        <OnboardingStepAnimatedItem index={2}>
          <div class={styles.fields}>
            <label class={styles.field}>
              <span class={styles.fieldLabel}>Nueva contraseña</span>
              <input
                class={styles.textInput}
                type="password"
                autocomplete="new-password"
                autofocus
                value={props.password}
                onInput={(event) =>
                  props.onPasswordInput(event.currentTarget.value)
                }
                required
              />
              <Show when={tooShort()}>
                <p class={styles.fieldError}>Usa al menos 8 caracteres.</p>
              </Show>
            </label>

            <label class={styles.field}>
              <span class={styles.fieldLabel}>Confirmar contraseña</span>
              <input
                class={styles.textInput}
                type="password"
                autocomplete="new-password"
                value={props.confirmPassword}
                onInput={(event) =>
                  props.onConfirmPasswordInput(event.currentTarget.value)
                }
                required
              />
              <Show when={mismatch()}>
                <p class={styles.fieldError}>Las contraseñas no coinciden.</p>
              </Show>
            </label>
          </div>
        </OnboardingStepAnimatedItem>
      </form>

      <OnboardingStepAnimatedItem index={3} class={styles.actionBlock}>
        <Button
          type="submit"
          form={FORM_ID}
          class={styles.primaryButton}
          loading={props.submitting}
          disabled={!canSubmit()}
        >
          Cambiar contraseña
        </Button>
      </OnboardingStepAnimatedItem>
    </>
  );
}
