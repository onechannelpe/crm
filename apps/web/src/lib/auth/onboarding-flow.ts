import type { CurrentUser } from "~/actions/auth";
import type { PasswordLoginPolicy } from "~/lib/auth/security/auth-contract";

export type OnboardingStep = "profile" | "security";

export interface OnboardingState {
  currentStep: OnboardingStep;
  profileReady: boolean;
  securityReady: boolean;
  canFinish: boolean;
}

export function getSecurityStepDescription(
  passwordLoginPolicy: PasswordLoginPolicy,
): string {
  if (passwordLoginPolicy === "passkey_only") {
    return "Ya tienes un método fuerte activo. Si luego quieres entrar con contraseña, añade también una aplicación de autenticación.";
  }

  if (passwordLoginPolicy === "password_or_totp") {
    return "Tu rol requiere un método fuerte para continuar. Si eliges entrar con contraseña, el segundo paso será un código TOTP.";
  }

  return "Puedes configurar la seguridad ahora o administrarla más tarde desde Configuración.";
}

export function deriveOnboardingState(input: {
  requestedStep: OnboardingStep;
  phoneE164: string;
  user: Pick<CurrentUser, "strongAuthRequired" | "strongAuthConfigured">;
}): OnboardingState {
  const profileReady = input.phoneE164.trim().length > 0;
  const securityReady =
    !input.user.strongAuthRequired || input.user.strongAuthConfigured;

  return {
    currentStep:
      input.requestedStep === "security" && !profileReady
        ? "profile"
        : input.requestedStep,
    profileReady,
    securityReady,
    canFinish: profileReady && securityReady,
  };
}
