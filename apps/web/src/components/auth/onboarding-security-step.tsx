import styles from "~/routes/onboarding-page.module.css";

interface OnboardingSecurityStepProps {
  onSelectMethod: (value: "passkey" | "totp") => void;
}

export function OnboardingSecurityStep(props: OnboardingSecurityStepProps) {
  return (
    <section class={styles.stepStack}>
      <div class={styles.choiceGrid}>
        <button
          type="button"
          class={styles.choiceCard}
          onClick={() => props.onSelectMethod("passkey")}
        >
          <span class={styles.choiceTitle}>Clave de acceso</span>
          <span class={styles.choiceDescription}>
            Ingreso con tu dispositivo.
          </span>
        </button>
        <button
          type="button"
          class={styles.choiceCard}
          onClick={() => props.onSelectMethod("totp")}
        >
          <span class={styles.choiceTitle}>Aplicación de autenticación</span>
          <span class={styles.choiceDescription}>
            Usa un código de 6 dígitos.
          </span>
        </button>
      </div>
    </section>
  );
}
