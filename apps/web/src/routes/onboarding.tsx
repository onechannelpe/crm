import { useNavigate, useSearchParams } from "@solidjs/router";
import {
  createMemo,
  createResource,
  createSignal,
  createEffect,
  Show,
  Suspense,
} from "solid-js";

import { chooseSecurity } from "~/actions/auth/onboarding/choose-security";
import { completeOnboardingStep } from "~/actions/auth/onboarding/complete-step";
import { finishPasskeyOnboardingStep } from "~/actions/auth/onboarding/finish-passkey-step";
import { startPasskeyOnboardingStep } from "~/actions/auth/onboarding/start-passkey-step";
import { startTotpOnboardingStep } from "~/actions/auth/onboarding/start-totp-step";
import { submitOnboardingProfile } from "~/actions/auth/onboarding/submit-profile";
import { verifyTotpOnboardingStep } from "~/actions/auth/onboarding/verify-totp-step";
import { getOnboardingRequirements } from "~/actions/auth/policy";
import { Loader } from "~/components/feedback/loading/loader";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SessionProvider } from "~/components/providers/session-provider";
import { useSession } from "~/components/providers/session-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { RecoveryCodesPanel } from "~/features/auth/security/recovery-codes-panel";
import { AuthFlowShell } from "~/features/auth/ui/auth-flow-shell";
import { OtpSlotInput } from "~/features/auth/ui/otp-slot-input";
import type { RequestedStep } from "~/features/onboarding/model/event";
import { buildView } from "~/features/onboarding/services/view";
import { OnboardingProfileStep } from "~/features/onboarding/ui/onboarding-profile-step";
import { OnboardingSecurityStep } from "~/features/onboarding/ui/onboarding-security-step";
import {
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
} from "~/lib/auth/passkey/registration-client";
import { getErrorMessage } from "~/lib/errors";
import {
  isValidPeMobileLocal,
  normalizePeMobileLocalInput,
} from "~/lib/phone/pe-mobile";

import styles from "~/features/onboarding/ui/onboarding-page.module.css";

type PasskeyPhase = "idle" | "device" | "server";

function parseRequestedStep(raw: string | string[] | undefined): RequestedStep {
  if (Array.isArray(raw) || !raw) return null;
  if (
    raw === "profile" ||
    raw === "security-choice" ||
    raw === "passkey-step" ||
    raw === "totp-step" ||
    raw === "pending-step"
  ) {
    return raw;
  }
  return null;
}

function parseSearchString(
  raw: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(raw)) return undefined;
  return raw;
}

function OnboardingProgress(props: { step: string }) {
  const percent = () => (props.step === "profile" ? 50 : 100);
  return (
    <progress
      class={styles.progressTrack}
      value={percent()}
      max={100}
      aria-label="Progreso del registro"
    />
  );
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
  const [passkeyPhase, setPasskeyPhase] = createSignal<PasskeyPhase>("idle");
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [totpEnrollment, setTotpEnrollment] = createSignal<{
    otpauthUri: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [totpStartAttempted, setTotpStartAttempted] = createSignal(false);
  const [totpCode, setTotpCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const [submitting, setSubmitting] = createSignal(false);

  const requestedStep = createMemo(() => parseRequestedStep(searchParams.step));

  const view = createMemo(() => {
    const currentUser = user();
    const policy = requirements();
    if (currentUser === undefined || policy === undefined || !policy) {
      return null;
    }
    return buildView({
      requirements: policy,
      userPhoneE164: currentUser?.phoneE164 ?? null,
      phoneDraft: parseSearchString(searchParams.phone),
      requestedStep: requestedStep(),
    });
  });

  createEffect(() => {
    setPasskeySupported(isPasskeyRegistrationSupported());
  });

  createEffect(() => {
    const next = view();
    if (!next) return;
    if (phone() === "" && next.phoneDraft !== "") {
      setPhone(next.phoneDraft);
    }
    if (next.state.step === "done") {
      navigate(requirements()?.nextRoute ?? "/");
    }
  });

  createEffect(() => {
    const next = view();
    if (!next || next.state.step !== "totp-step") {
      setTotpStartAttempted(false);
      setTotpEnrollment(null);
    }
  });

  createEffect(() => {
    const next = view();
    if (!next || next.state.step !== "totp-step") {
      return;
    }
    if (totpEnrollment() || totpLoading() || totpStartAttempted()) {
      return;
    }
    setTotpStartAttempted(true);
    setTotpLoading(true);
    void startTotpOnboardingStep()
      .then((enrollment) => setTotpEnrollment(enrollment))
      .catch((error: unknown) =>
        enqueueErrorSnackBar(
          getErrorMessage(error, "No se pudo iniciar la configuración TOTP"),
        ),
      )
      .finally(() => setTotpLoading(false));
  });

  async function handleProfileSubmit() {
    const currentPhone = normalizePeMobileLocalInput(phone());
    setPhone(currentPhone);
    if (!isValidPeMobileLocal(currentPhone)) {
      enqueueErrorSnackBar(
        "Ingresa 9 dígitos de tu WhatsApp corporativo y que empiece con 9",
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitOnboardingProfile({ phone: currentPhone });
      navigate(result.redirectTo);
    } catch (error: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(error, "No se pudo continuar con el registro"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChooseSecurity(method: "passkey-step" | "totp-step") {
    setSubmitting(true);
    try {
      const result = await chooseSecurity({ method });
      navigate(result.redirectTo);
    } catch (error: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(error, "No se pudo seleccionar el método de seguridad"),
      );
    } finally {
      setSubmitting(false);
    }
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
      const { challengeId, options } = await startPasskeyOnboardingStep();
      const response = await createRegistrationResponse(options);
      setPasskeyPhase("server");
      const result = await finishPasskeyOnboardingStep({
        challengeId,
        response,
      });
      navigate(result.redirectTo);
    } catch (error: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(error, "No se pudo configurar la clave de acceso"),
      );
    } finally {
      setPasskeyPhase("idle");
    }
  }

  async function handleTotpVerify() {
    if (totpCode().length < 6) return;
    setTotpLoading(true);
    try {
      const result = await verifyTotpOnboardingStep({ code: totpCode() });
      setRecoveryCodes(result.recoveryCodes);
      enqueueSuccessSnackBar("Autenticación en dos pasos configurada");
      await refreshCurrentUser();
      await refetchRequirements();
    } catch (error: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(error, "No se pudo verificar el código"),
      );
    } finally {
      setTotpLoading(false);
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    try {
      const result = await completeOnboardingStep();
      navigate(result.redirectTo);
    } catch (error: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(error, "No se pudo completar el registro"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const title = createMemo(() => {
    const next = view();
    if (!next) return "Onboarding";
    switch (next.state.step) {
      case "profile":
        return "Perfil";
      case "security-choice":
        return "Seguridad";
      case "passkey-step":
        return "Clave de acceso";
      case "totp-step":
        return "Aplicación de autenticación";
      case "pending-step":
        return "Creando tu espacio de trabajo";
      default:
        return "Onboarding";
    }
  });

  const resolved = createMemo(() => {
    const next = view();
    const current = user();
    if (!next || !current) return null;
    return { next, current };
  });

  return (
    <Show when={resolved()} keyed>
      {(state) => (
        <AuthFlowShell
          topBar={<OnboardingProgress step={state.next.state.step} />}
          title={title()}
          footer={
            <div class={styles.footerActions}>
              <Show when={state.next.state.step === "profile"}>
                <Button
                  type="button"
                  loading={submitting()}
                  onClick={() => void handleProfileSubmit()}
                >
                  Continuar
                </Button>
              </Show>
              <Show
                when={
                  state.next.state.step === "security-choice" &&
                  state.next.state.canFinishWithoutSecurity
                }
              >
                <Button
                  type="button"
                  loading={submitting()}
                  onClick={() => void handleComplete()}
                >
                  Finalizar
                </Button>
              </Show>
              <Show
                when={
                  state.next.state.step === "totp-step" &&
                  recoveryCodes().length > 0
                }
              >
                <Button
                  type="button"
                  loading={submitting()}
                  onClick={() => void handleComplete()}
                >
                  Finalizar
                </Button>
              </Show>
            </div>
          }
        >
          <Show when={state.next.state.step === "profile"}>
            <EnterTransition>
              <OnboardingProfileStep
                email={state.current.email}
                fullName={`${state.current.names} ${state.current.firstSurname} ${state.current.secondSurname}`}
                phone={phone()}
                role={state.current.role}
                onPhoneInput={setPhone}
              />
            </EnterTransition>
          </Show>

          <Show when={state.next.state.step === "security-choice"}>
            <EnterTransition>
              <OnboardingSecurityStep
                hasPasskey={state.current.hasPasskey}
                totpEnabled={state.current.totpEnabled}
                securityRequired={state.next.state.securityRequired}
                onSelectPasskey={() =>
                  void handleChooseSecurity("passkey-step")
                }
                onSelectTotp={() => void handleChooseSecurity("totp-step")}
              />
            </EnterTransition>
          </Show>

          <Show when={state.next.state.step === "passkey-step"}>
            <EnterTransition>
              <div class={styles.passkeyEnrollStep}>
                <Show when={passkeyPhase() === "device"}>
                  <p class={styles.passkeyStatus}>
                    Esperando tu dispositivo...
                  </p>
                </Show>
                <Show when={passkeyPhase() === "server"}>
                  <p class={styles.passkeyStatus}>Guardando tu registro...</p>
                </Show>
                <Show when={passkeyPhase() === "idle"}>
                  <Button
                    type="button"
                    onClick={() => void handlePasskeySetup()}
                  >
                    Configurar clave de acceso
                  </Button>
                </Show>
              </div>
            </EnterTransition>
          </Show>

          <Show when={state.next.state.step === "totp-step"}>
            <EnterTransition>
              <div class={styles.totpStack}>
                <Show
                  when={totpEnrollment()}
                  fallback={
                    <Show when={totpLoading()}>
                      <p class={styles.passkeyStatus}>Generando código QR...</p>
                    </Show>
                  }
                >
                  {(enrollment) => (
                    <div class={styles.totpInline}>
                      <div class={styles.qrCenter}>
                        <img
                          src={enrollment().qrCodeDataUrl}
                          alt="Código QR para autenticación"
                          class={styles.qrCode}
                        />
                      </div>
                      <details class={styles.secretDetails}>
                        <summary>¿No puedes escanear el código?</summary>
                        <div class={styles.secretKeyBlock}>
                          <span class={styles.secretKeyLabel}>
                            Ingresa esta clave en tu app
                          </span>
                          <span class={styles.secretKeyText}>
                            {new URL(enrollment().otpauthUri).searchParams.get(
                              "secret",
                            )}
                          </span>
                        </div>
                      </details>
                      <OtpSlotInput
                        value={totpCode()}
                        disabled={totpLoading()}
                        onValueChange={setTotpCode}
                      />
                      <Button
                        type="button"
                        disabled={totpLoading() || totpCode().length < 6}
                        loading={totpLoading()}
                        onClick={() => void handleTotpVerify()}
                      >
                        Verificar
                      </Button>
                    </div>
                  )}
                </Show>

                <Show when={recoveryCodes().length > 0}>
                  <RecoveryCodesPanel
                    title="Códigos de recuperación"
                    description="Guárdalos en un lugar seguro."
                    codes={recoveryCodes()}
                  />
                </Show>
              </div>
            </EnterTransition>
          </Show>

          <Show when={state.next.state.step === "pending-step"}>
            <div class={styles.pendingCreationLoader}>
              <p class={styles.pendingCreationLabel}>
                Procesando tu configuración...
              </p>
              <output class={styles.loadingStack} aria-live="polite">
                <Loader />
              </output>
            </div>
          </Show>
        </AuthFlowShell>
      )}
    </Show>
  );
}

export default function OnboardingPage() {
  return (
    <SessionProvider>
      <Suspense
        fallback={
          <AuthFlowShell title="Cargando onboarding">
            <output class={styles.loadingStack} aria-live="polite">
              <Loader />
            </output>
          </AuthFlowShell>
        }
      >
        <OnboardingContent />
      </Suspense>
    </SessionProvider>
  );
}
