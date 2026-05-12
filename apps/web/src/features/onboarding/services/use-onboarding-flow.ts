import { useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal } from "solid-js";

import {
  completeOnboarding,
  completePasskeyOnboarding,
} from "~/actions/auth/onboarding";
import { beginPasskeyRegistration } from "~/actions/auth/onboarding/passkey";
import { getOnboardingRequirements } from "~/actions/auth/policy";
import { useTotpEnrollment } from "~/features/auth/security/use-totp-enrollment";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { useSession } from "~/components/providers/session-provider";
import { isValidOnboardingPhone } from "~/features/onboarding/model/onboarding-phone";
import {
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
} from "~/lib/auth/passkey/registration-client";
import { getErrorMessage } from "~/lib/errors";
import type { OnboardingRequirements } from "~/server/auth/policy/types";

export type OnboardingView = "profile" | "security-choice" | "passkey" | "totp";
export type PasskeyOnboardingPhase = "idle" | "device" | "server";
export type PendingCreationLoaderStep = "none" | "step-1" | "step-2" | "step-3";

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar, enqueueInfoSnackBar } =
    useSnackBar();
  const { user, refreshCurrentUser } = useSession();

  const [step, setStep] = createSignal<OnboardingView>("profile");
  const [phone, setPhone] = createSignal("");
  const [onboardingSubmitting, setOnboardingSubmitting] = createSignal(false);
  const [passkeyPhase, setPasskeyPhase] =
    createSignal<PasskeyOnboardingPhase>("idle");
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [requirements, setRequirements] =
    createSignal<OnboardingRequirements | null>(null);
  const [pendingCreationLoaderStep, setPendingCreationLoaderStep] =
    createSignal<PendingCreationLoaderStep>("none");
  let creationLoaderTimerIds: number[] = [];

  const submitting = createMemo(
    () => onboardingSubmitting() || passkeyPhase() === "server",
  );
  const canGoBack = createMemo(
    () => !onboardingSubmitting() && passkeyPhase() === "idle",
  );

  async function completeOnboardingAndRedirect(
    action: () => Promise<{ redirectTo: string }>,
  ) {
    const result = await action();
    enqueueSuccessSnackBar("Tu cuenta ya quedó configurada");
    navigate(result.redirectTo);
  }

  const clearCreationLoaderSchedule = () => {
    for (const id of creationLoaderTimerIds) {
      clearTimeout(id);
    }
    creationLoaderTimerIds = [];
  };

  const scheduleCreationLoader = () => {
    clearCreationLoaderSchedule();
    creationLoaderTimerIds.push(
      window.setTimeout(() => setPendingCreationLoaderStep("step-1"), 500),
    );
    creationLoaderTimerIds.push(
      window.setTimeout(() => setPendingCreationLoaderStep("step-2"), 2000),
    );
    creationLoaderTimerIds.push(
      window.setTimeout(() => setPendingCreationLoaderStep("step-3"), 5000),
    );
  };

  async function submitOnboarding(
    action: () => Promise<{ redirectTo: string }>,
    failureMessage: string,
  ) {
    if (submitting()) {
      return;
    }

    setOnboardingSubmitting(true);
    scheduleCreationLoader();
    try {
      await completeOnboardingAndRedirect(action);
    } catch (error: unknown) {
      enqueueErrorSnackBar(getErrorMessage(error, failureMessage));
    } finally {
      clearCreationLoaderSchedule();
      setPendingCreationLoaderStep("none");
      setOnboardingSubmitting(false);
    }
  }

  const refreshRequirements = async () => {
    const next = await getOnboardingRequirements();
    setRequirements(next);
  };

  const refreshAuthState = async () => {
    await refreshCurrentUser();
    await refreshRequirements();
  };

  const totpEnrollment = useTotpEnrollment({
    enqueueSuccessSnackBar,
    enqueueErrorSnackBar,
    enqueueInfoSnackBar,
    refreshStatus: refreshAuthState,
  });

  createEffect(() => {
    setPasskeySupported(isPasskeyRegistrationSupported());
  });

  createEffect(() => {
    if (user() !== null) {
      void refreshRequirements();
    }
  });

  createEffect(() => {
    const policy = requirements();
    if (!policy) {
      return;
    }

    if (
      policy.sessionState === "app_ready" &&
      policy.canAccessApp &&
      policy.nextRoute !== "/onboarding"
    ) {
      navigate(policy.nextRoute);
      return;
    }

    if (
      policy.sessionState === "onboarding_security_required" &&
      step() === "profile" &&
      isValidOnboardingPhone(phone())
    ) {
      setStep("security-choice");
    }
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
      clearCreationLoaderSchedule();
      setPendingCreationLoaderStep("none");
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
    const policy = requirements();
    if (!u || policy === null) {
      return {
        profileReady: false,
        securityRequired: false,
        securityReady: false,
        canFinish: false,
        canFinishWithoutSecurity: false,
      };
    }

    const profileReady = isValidOnboardingPhone(phone());
    const securityRequired = policy.requiredActions.includes(
      "configure_strong_auth",
    );
    const securityReady = !securityRequired || u.strongAuthConfigured;

    return {
      profileReady,
      securityRequired,
      securityReady,
      canFinish: profileReady && securityReady,
      canFinishWithoutSecurity: profileReady && !securityRequired,
    };
  });

  function goBack() {
    if (!canGoBack()) {
      return;
    }

    if (step() === "security-choice") setStep("profile");
    else if (step() === "passkey" || step() === "totp")
      setStep("security-choice");
  }

  function handleProfileContinue() {
    if (!isValidOnboardingPhone(phone())) {
      enqueueErrorSnackBar("Ingresa los 9 dígitos de tu WhatsApp corporativo");
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
    if (passkeyPhase() !== "idle") {
      return;
    }

    setPasskeyPhase("device");
    try {
      const { challengeId, options } = await beginPasskeyRegistration();
      const response = await createRegistrationResponse(options);
      setPasskeyPhase("server");
      await completeOnboardingAndRedirect(() =>
        completePasskeyOnboarding(phone(), challengeId, response),
      );
    } catch (error: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(error, "No se pudo configurar la clave de acceso"),
      );
    } finally {
      setPasskeyPhase("idle");
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!onboardingState().canFinish) {
      return;
    }
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
    canGoBack,
    passkeyPhase,
    onboardingState,
    passkeySupported,
    totpEnrollment,
    pendingCreationLoaderStep,
    goBack,
    handleProfileContinue,
    handlePasskeySelection,
    registerPasskeyAndFinishOnboarding,
    handleSubmit,
  };
}
