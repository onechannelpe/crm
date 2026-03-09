import { useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal } from "solid-js";

import { completeOnboarding } from "~/actions/auth";
import { usePasskeyEnrollment } from "~/components/auth/use-passkey-enrollment";
import { useTotpEnrollment } from "~/components/auth/use-totp-enrollment";
import { useToast } from "~/components/feedback/toast-provider";
import { useSession } from "~/components/providers/session-provider";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  deriveOnboardingState,
  isValidOnboardingPhone,
  type OnboardingStep,
} from "~/lib/auth/onboarding-flow";
import { getErrorMessage } from "~/lib/errors";

export type OnboardingView = "profile" | "security-choice" | "passkey" | "totp";

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, refreshCurrentUser } = useSession();

  const [step, setStep] = createSignal<OnboardingView>("profile");
  const [phone, setPhone] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const passkeyEnrollment = usePasskeyEnrollment({
    showToast,
    refreshStatus: refreshCurrentUser,
  });

  const totpEnrollment = useTotpEnrollment({
    showToast,
    refreshStatus: refreshCurrentUser,
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

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const u = user();
      if (!u) throw new Error("No se encontró la sesión");
      await completeOnboarding(phone());
      showToast("success", "Tu cuenta ya quedó configurada");
      await refreshCurrentUser();
      navigate(getDefaultAppPath(u.role));
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo completar el registro"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    user,
    step,
    setStep,
    phone,
    setPhone,
    submitting,
    onboardingState,
    passkeyEnrollment,
    totpEnrollment,
    goBack,
    handleProfileContinue,
    handleSubmit,
  };
}
