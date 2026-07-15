import { ResponsiveImage } from "@crm/images";

import logo from "~/assets/images/logo/logo.webp?responsive";

import { OnboardingActivationSteps } from "./onboarding-activation-steps";

import styles from "./onboarding-page.module.css";

const ACTIVATION_MESSAGES = [
  "Verificando tu cuenta",
  "Preparando tu espacio de trabajo",
  "Aplicando tu configuración",
  "Casi listo",
];

interface OnboardingPendingStepProps {
  onComplete: () => void;
}

export function OnboardingPendingStep(props: OnboardingPendingStepProps) {
  return (
    <div class={styles.pendingStack}>
      <ResponsiveImage
        sources={logo}
        alt="CRM"
        width="40"
        height="40"
        class={styles.pendingLogo}
      />
      <OnboardingActivationSteps
        messages={ACTIVATION_MESSAGES}
        onComplete={props.onComplete}
      />
    </div>
  );
}
