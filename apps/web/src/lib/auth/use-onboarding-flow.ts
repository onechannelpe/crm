import { useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal } from "solid-js";

import {
  beginPasskeyRegistration,
  completeOnboarding,
  completePasskeyOnboarding,
} from "~/actions/auth";
import { useTotpEnrollment } from "~/components/auth/security-enrollment/use-totp-enrollment";
import { useToast } from "~/components/feedback/toast-provider";
import { useSession } from "~/components/providers/session-provider";
import {
  deriveOnboardingState,
  isValidOnboardingPhone,
  type OnboardingStep,
} from "~/lib/auth/onboarding-flow";
import {
  createRegistrationResponse,
  isPasskeySupported,
} from "~/lib/auth/passkey/client";
import { getErrorMessage } from "~/lib/errors";

export type OnboardingView = "profile" | "security-choice" | "passkey" | "totp";

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, refreshCurrentUser } = useSession();

  const [step, setStep] = createSignal<OnboardingView>("profile");
  const [phone, setPhone] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [passkeySupported, setPasskeySupported] = createSignal(false);

  async function submitOnboarding(
    action: () => Promise<{ redirectTo: string }>,
    failureMessage: string,
  ) {
    if (submitting()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await action();
      showToast("success", "Tu cuenta ya quedó configurada");
      navigate(result.redirectTo);
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error, failureMessage));
    } finally {
      setSubmitting(false);
    }
  }

  const totpEnrollment = useTotpEnrollment({
    showToast,
    refreshStatus: refreshCurrentUser,
  });

  createEffect(() => {
    setPasskeySupported(isPasskeySupported());
  });

  // Sync phone from session on first load, strip +51 prefix for local display
  createEffect(() => {
    const u = user();
    if (u && !phone() && u.phoneE164) {
      const local = u.phoneE164.startsWith("+51")
        ? u.phoneE164.slice(3)
        : u.phoneE164;
      setPhone(local);
    }
  });

  // Redirect to login if session expires mid-onboarding
  createEffect(() => {
    if (user() === null) {
      navigate("/login");
    }
  });

  // Auto-start TOTP enrollment immediately when entering the TOTP step
  createEffect(() => {
    const u = user();
    if (
      step() === "totp" &&
      u != null &&
      !u.totpEnabled &&
      !totpEnrollment.enrollment() &&
      !totpEnrollment.loading()
    ) {
      void totpEnrollment.beginEnrollment();
    }
  });

  const onboardingState = createMemo(() => {
    const u = user();
    if (!u) {
      return {
        currentStep: "profile" as OnboardingStep,
        profileReady: false,
        securityReady: false,
        canFinish: false,
      };
    }
    return deriveOnboardingState({
      requestedStep:
        step() === "profile" ? "profile" : ("security" as OnboardingStep),
      phoneE164: phone(),
      user: u,
    });
  });

  function goBack() {
    if (step() === "security-choice") setStep("profile");
    else if (step() === "passkey" || step() === "totp")
      setStep("security-choice");
  }

  function handleProfileContinue() {
    if (!isValidOnboardingPhone(phone())) {
      showToast("error", "Ingresa los 9 dígitos de tu WhatsApp corporativo");
      return;
    }
    setStep("security-choice");
  }

  function handlePasskeySelection() {
    if (user()?.hasPasskey) {
      void submitOnboarding(
        () => completeOnboarding(phone()),
        "No se pudo completar el registro",
      );
      return;
    }

    setStep("passkey");

    if (!passkeySupported()) {
      return;
    }

    // Browser WebAuthn must stay in the original click handler.
    void registerPasskeyAndFinishOnboarding();
  }

  async function registerPasskeyAndFinishOnboarding() {
    try {
      const { challengeId, options } = await beginPasskeyRegistration();
      await submitOnboarding(async () => {
        return completePasskeyOnboarding(
          phone(),
          challengeId,
          await createRegistrationResponse(options),
        );
      }, "No se pudo configurar la clave de acceso");
    } catch (error: unknown) {
      showToast(
        "error",
        getErrorMessage(error, "No se pudo configurar la clave de acceso"),
      );
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    await submitOnboarding(
      () => completeOnboarding(phone()),
      "No se pudo completar el registro",
    );
  }

  return {
    user,
    step,
    setStep,
    phone,
    setPhone,
    submitting,
    onboardingState,
    passkeySupported,
    totpEnrollment,
    goBack,
    handleProfileContinue,
    handlePasskeySelection,
    registerPasskeyAndFinishOnboarding,
    handleSubmit,
  };
}
