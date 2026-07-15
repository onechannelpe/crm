import { useNavigate, useSearchParams } from "@solidjs/router";
import {
  createMemo,
  createResource,
  createSignal,
  createEffect,
  Match,
  Show,
  Suspense,
  Switch,
} from "solid-js";

import { changeOnboardingPassword } from "~/actions/auth/onboarding/change-password";
import {
  completeOnboardingFromCurrentSession,
  completeOnboardingWithPasskey,
} from "~/actions/auth/onboarding/complete";
import { submitOnboardingProfile } from "~/actions/auth/onboarding/submit-profile";
import { getOnboardingRequirements } from "~/actions/auth/policy";
import { beginPasskeyEnrollment } from "~/actions/auth/security/passkey";
import {
  beginTotpEnrollment,
  finishTotpEnrollment,
} from "~/actions/auth/security/totp";
import { acknowledgeRecoveryCodes } from "~/actions/settings/security";
import { Loader } from "~/components/feedback/loading/loader";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SessionProvider } from "~/components/providers/session-provider";
import { useSession } from "~/components/providers/session-provider";
import type { RequestedStep } from "~/features/onboarding/model/event";
import { buildView } from "~/features/onboarding/services/view";
import { OnboardingPasskeyStep } from "~/features/onboarding/ui/onboarding-passkey-step";
import type { PasskeyPhase } from "~/features/onboarding/ui/onboarding-passkey-step";
import { OnboardingPasswordStep } from "~/features/onboarding/ui/onboarding-password-step";
import { OnboardingPendingStep } from "~/features/onboarding/ui/onboarding-pending-step";
import { OnboardingProfileStep } from "~/features/onboarding/ui/onboarding-profile-step";
import { OnboardingSecurityStep } from "~/features/onboarding/ui/onboarding-security-step";
import { OnboardingShell } from "~/features/onboarding/ui/onboarding-shell";
import { OnboardingTotpStep } from "~/features/onboarding/ui/onboarding-totp-step";
import {
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
} from "~/lib/auth/passkey/registration-client";
import { isValidPhone, normalizePhoneInput } from "~/lib/phone/pe-mobile";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "~/features/onboarding/ui/onboarding-page.module.css";

function parseRequestedStep(raw: string | string[] | undefined): RequestedStep {
  if (Array.isArray(raw) || !raw) return null;
  if (
    raw === "security-choice" ||
    raw === "passkey-step" ||
    raw === "totp-step"
  ) {
    return raw;
  }
  return null;
}

function OnboardingContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshCurrentUser } = useSession();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const [requirements, { refetch: refetchRequirements }] = createResource(
    getOnboardingRequirements,
  );

  const [phone, setPhone] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [passkeyPhase, setPasskeyPhase] = createSignal<PasskeyPhase>("idle");
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  // Keep newly issued codes visible until acknowledgement; stored codes are
  // never returned.
  const [passkeyRecoveryCodes, setPasskeyRecoveryCodes] = createSignal<
    string[]
  >([]);
  const [passkeyRedirectTo, setPasskeyRedirectTo] = createSignal<string | null>(
    null,
  );
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [totpEnrollment, setTotpEnrollment] = createSignal<{
    otpauthUri: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [totpStartAttempted, setTotpStartAttempted] = createSignal(false);
  const [totpCode, setTotpCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const [submitting, setSubmitting] = createSignal(false);
  // Delay app-route navigation until the preparation animation completes.
  const [completingRedirect, setCompletingRedirect] = createSignal<
    string | null
  >(null);

  const requestedStep = createMemo(() => parseRequestedStep(searchParams.step));
  const view = createMemo(() => {
    const currentUser = user();
    const policy = requirements();
    if (currentUser === undefined || policy === undefined || !policy) {
      return null;
    }
    return buildView({
      requirements: policy,
      userPhone: currentUser?.phone ?? null,
      requestedStep: requestedStep(),
    });
  });

  createEffect(() => {
    setPasskeySupported(isPasskeyRegistrationSupported());
  });

  createEffect(() => {
    if (completingRedirect()) return;
    const next = view();
    if (next?.step === "done") {
      navigate(requirements()?.nextRoute ?? "/");
    }
  });

  createEffect(() => {
    const next = view();
    if (!next || next.step !== "totp-step") {
      setTotpStartAttempted(false);
      setTotpEnrollment(null);
    }
  });

  createEffect(() => {
    const next = view();
    if (!next || next.step !== "totp-step") return;
    if (totpEnrollment() || totpLoading() || totpStartAttempted()) return;
    setTotpStartAttempted(true);
    setTotpLoading(true);
    void beginTotpEnrollment()
      .then((enrollment) => setTotpEnrollment(enrollment))
      .catch((error: unknown) =>
        enqueueErrorSnackBar(actionErrorMessage(error)),
      )
      .finally(() => setTotpLoading(false));
  });

  // Navigate within onboarding immediately; defer app-route navigation until
  // preparation ends.
  function finish(redirectTo: string) {
    if (redirectTo.startsWith("/onboarding")) {
      navigate(redirectTo);
      return;
    }
    setCompletingRedirect(redirectTo);
  }

  async function handlePasswordSubmit() {
    setSubmitting(true);
    try {
      await changeOnboardingPassword({
        password: password(),
        confirmPassword: confirmPassword(),
      });
      setPassword("");
      setConfirmPassword("");
      await refreshCurrentUser();
      await refetchRequirements();
    } catch (error: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileSubmit() {
    const currentPhone = normalizePhoneInput(phone());
    setPhone(currentPhone);
    if (!isValidPhone(currentPhone)) return;
    setSubmitting(true);
    try {
      const result = await submitOnboardingProfile({ phone: currentPhone });
      await refreshCurrentUser();
      finish(result.redirectTo);
    } catch (error: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleChooseSecurity(method: "passkey-step" | "totp-step") {
    navigate(`/onboarding?step=${method}`);
  }

  async function handlePasskeySetup() {
    if (!passkeySupported()) {
      enqueueErrorSnackBar(
        "Este dispositivo no es compatible con claves de acceso.",
      );
      return;
    }
    setPasskeyPhase("device");
    try {
      const { challengeId, options } = await beginPasskeyEnrollment();
      const response = await createRegistrationResponse(options);
      setPasskeyPhase("server");
      const result = await completeOnboardingWithPasskey({
        challengeId,
        response,
      });
      if (result.recoveryCodes.length > 0) {
        setPasskeyRedirectTo(result.redirectTo);
        setPasskeyRecoveryCodes(result.recoveryCodes);
        return;
      }
      finish(result.redirectTo);
    } catch (error: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setPasskeyPhase("idle");
    }
  }

  async function acknowledgeRecoveryCodesQuietly() {
    try {
      await acknowledgeRecoveryCodes();
    } catch {
      // Ignore acknowledgement failures because the session is established and
      // navigation must proceed.
    }
  }

  async function handlePasskeyComplete() {
    const redirectTo = passkeyRedirectTo();
    if (!redirectTo) return;
    await acknowledgeRecoveryCodesQuietly();
    finish(redirectTo);
  }

  async function handleTotpVerify() {
    if (totpCode().length < 6) return;
    setTotpLoading(true);
    try {
      const result = await finishTotpEnrollment(totpCode());
      setRecoveryCodes(result.recoveryCodes);
      enqueueSuccessSnackBar(result.message);
      await refreshCurrentUser();
      await refetchRequirements();
    } catch (error: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setTotpLoading(false);
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    try {
      if (recoveryCodes().length > 0) {
        await acknowledgeRecoveryCodesQuietly();
      }
      const result = await completeOnboardingFromCurrentSession();
      finish(result.redirectTo);
    } catch (error: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const resolved = createMemo(() => {
    const next = view();
    const current = user();
    if (!next || !current) return null;
    return { next, current };
  });

  return (
    <Show when={resolved()} keyed>
      {(state) => {
        const isSubStep =
          state.next.step === "passkey-step" || state.next.step === "totp-step";

        return (
          <OnboardingShell
            onBack={
              !completingRedirect() &&
              isSubStep &&
              passkeyRecoveryCodes().length === 0
                ? () => navigate("/onboarding?step=security-choice")
                : undefined
            }
            centered={completingRedirect() !== null}
          >
            <Show
              when={completingRedirect()}
              fallback={
                <Switch>
                  <Match when={state.next.step === "password"}>
                    <OnboardingPasswordStep
                      password={password()}
                      confirmPassword={confirmPassword()}
                      submitting={submitting()}
                      onPasswordInput={setPassword}
                      onConfirmPasswordInput={setConfirmPassword}
                      onSubmit={() => void handlePasswordSubmit()}
                    />
                  </Match>

                  <Match when={state.next.step === "profile"}>
                    <OnboardingProfileStep
                      email={state.current.email}
                      fullName={`${state.current.names} ${state.current.firstSurname} ${state.current.secondSurname}`}
                      role={state.current.role}
                      phone={phone()}
                      submitting={submitting()}
                      onPhoneInput={setPhone}
                      onSubmit={() => void handleProfileSubmit()}
                    />
                  </Match>

                  <Match when={state.next.step === "security-choice"}>
                    <OnboardingSecurityStep
                      hasPasskey={state.current.hasPasskey}
                      totpEnabled={state.current.totpEnabled}
                      securityRequired={state.next.securityRequired}
                      finishing={submitting()}
                      onSelectPasskey={() =>
                        handleChooseSecurity("passkey-step")
                      }
                      onSelectTotp={() => handleChooseSecurity("totp-step")}
                      onFinishWithoutSecurity={() => void handleComplete()}
                    />
                  </Match>

                  <Match when={state.next.step === "passkey-step"}>
                    <OnboardingPasskeyStep
                      phase={passkeyPhase()}
                      recoveryCodes={passkeyRecoveryCodes()}
                      finishing={submitting()}
                      onSetup={() => void handlePasskeySetup()}
                      onComplete={handlePasskeyComplete}
                    />
                  </Match>

                  <Match when={state.next.step === "totp-step"}>
                    <OnboardingTotpStep
                      enrollment={totpEnrollment()}
                      loading={totpLoading()}
                      code={totpCode()}
                      recoveryCodes={recoveryCodes()}
                      finishing={submitting()}
                      onCodeInput={setTotpCode}
                      onVerify={() => void handleTotpVerify()}
                      onComplete={() => void handleComplete()}
                    />
                  </Match>
                </Switch>
              }
            >
              {(redirectTo) => (
                <OnboardingPendingStep
                  onComplete={() => navigate(redirectTo())}
                />
              )}
            </Show>
          </OnboardingShell>
        );
      }}
    </Show>
  );
}

export default function OnboardingPage() {
  return (
    <SessionProvider>
      <Suspense
        fallback={
          <OnboardingShell centered>
            <output class={styles.loaderCenter} aria-live="polite">
              <Loader />
            </output>
          </OnboardingShell>
        }
      >
        <OnboardingContent />
      </Suspense>
    </SessionProvider>
  );
}
