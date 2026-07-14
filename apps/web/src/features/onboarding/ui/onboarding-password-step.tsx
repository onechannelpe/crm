import styles from "./onboarding-page.module.css";

interface OnboardingPasswordStepProps {
  password: string;
  confirmPassword: string;
  onPasswordInput: (value: string) => void;
  onConfirmPasswordInput: (value: string) => void;
}

export function OnboardingPasswordStep(props: OnboardingPasswordStepProps) {
  return (
    <section class={styles.passwordStep}>
      <p class={styles.passwordHint}>
        Reemplaza la contraseña temporal antes de configurar tu cuenta.
      </p>
      <label class={styles.passwordField}>
        <span>Nueva contraseña</span>
        <input
          type="password"
          autocomplete="new-password"
          minlength="8"
          value={props.password}
          onInput={(event) => props.onPasswordInput(event.currentTarget.value)}
          required
        />
      </label>
      <label class={styles.passwordField}>
        <span>Confirmar contraseña</span>
        <input
          type="password"
          autocomplete="new-password"
          minlength="8"
          value={props.confirmPassword}
          onInput={(event) =>
            props.onConfirmPasswordInput(event.currentTarget.value)
          }
          required
        />
      </label>
    </section>
  );
}
