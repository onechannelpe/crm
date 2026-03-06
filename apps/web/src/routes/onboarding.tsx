import { useNavigate } from "@solidjs/router";
import { Show, createEffect, createMemo, createSignal } from "solid-js";

import { completeOnboarding } from "~/actions/auth";
import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { OnboardingProfileStep } from "~/components/auth/onboarding-profile-step";
import { OnboardingSecurityStep } from "~/components/auth/onboarding-security-step";
import { RecoveryCodesPanel } from "~/components/auth/recovery-codes-panel";
import { TotpMethodCard } from "~/components/auth/totp-method-card";
import { usePasskeyEnrollment } from "~/components/auth/use-passkey-enrollment";
import { useTotpEnrollment } from "~/components/auth/use-totp-enrollment";
import { useToast } from "~/components/feedback/toast-provider";
import {
  SessionProvider,
  useSession,
} from "~/components/providers/session-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  deriveOnboardingState,
  isValidOnboardingPhone,
  type OnboardingStep,
} from "~/lib/auth/onboarding-flow";
import { getErrorMessage } from "~/lib/errors";

import styles from "./onboarding-page.module.css";

type OnboardingView = "profile" | "security-choice" | "passkey" | "totp";

function OnboardingContent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, refreshCurrentUser } = useSession();
  const [phone, setPhone] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [step, setStep] = createSignal<OnboardingView>("profile");
  const passkeyEnrollment = usePasskeyEnrollment({
    showToast,
    refreshStatus: refreshCurrentUser,
  });
  const totpEnrollment = useTotpEnrollment({
    showToast,
    refreshStatus: refreshCurrentUser,
    beginInfoMessage: "Escanea el QR y verifica el código de 6 dígitos",
  });

  createEffect(() => {
    const currentUser = user();
    if (!currentUser) return;
    if (!phone() && currentUser.phoneE164) {
      setPhone(currentUser.phoneE164);
    }
  });

  const onboardingState = createMemo(() => {
    const currentUser = user();
    if (!currentUser) {
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
      user: currentUser,
    });
  });

  function handleProfileContinue() {
    if (!isValidOnboardingPhone(phone())) {
      showToast(
        "error",
        "Ingresa un WhatsApp corporativo válido en formato E.164",
      );
      return;
    }
    setStep("security-choice");
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const currentUser = user();
      if (!currentUser) {
        throw new Error("No se encontró la sesión");
      }
      await completeOnboarding(phone());
      showToast("success", "Perfil y seguridad listos");
      await refreshCurrentUser();
      navigate(getDefaultAppPath(currentUser.role));
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo completar el registro"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Show when={user()} keyed>
      {(currentUser) => (
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <AuthFlowShell
            title={
              step() === "profile"
                ? "Perfil"
                : step() === "security-choice"
                  ? "Seguridad"
                  : step() === "passkey"
                    ? "Clave de acceso"
                    : "Aplicación de autenticación"
            }
            description={
              step() === "passkey"
                ? "Usa tu dispositivo para ingresar."
                : undefined
            }
            footer={
              <>
                <div class={styles.footerActions}>
                  <Show when={step() !== "profile"}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        if (step() === "security-choice") setStep("profile");
                        if (step() === "passkey" || step() === "totp") {
                          setStep("security-choice");
                        }
                      }}
                    >
                      Atrás
                    </Button>
                  </Show>
                  <Show
                    when={step() !== "profile" && step() !== "security-choice"}
                    fallback={
                      <Button
                        type="button"
                        onClick={() => {
                          if (step() === "profile") {
                            handleProfileContinue();
                            return;
                          }
                        }}
                        disabled={step() === "security-choice"}
                      >
                        Continuar
                      </Button>
                    }
                  >
                    <Button
                      type="submit"
                      disabled={submitting() || !onboardingState().canFinish}
                    >
                      {submitting() ? "Guardando..." : "Continuar"}
                    </Button>
                  </Show>
                </div>
              </>
            }
          >
            <Show when={step() === "profile"}>
              <EnterTransition>
                <OnboardingProfileStep
                  email={currentUser.email}
                  fullName={`${currentUser.names} ${currentUser.firstSurname} ${currentUser.secondSurname}`}
                  phone={phone()}
                  role={currentUser.role}
                  onPhoneInput={setPhone}
                />
              </EnterTransition>
            </Show>

            <Show when={step() === "security-choice"}>
              <EnterTransition>
                <OnboardingSecurityStep
                  onSelectMethod={(value) =>
                    setStep(value === "passkey" ? "passkey" : "totp")
                  }
                />
              </EnterTransition>
            </Show>

            <Show when={step() === "passkey"}>
              <EnterTransition>
                <div class={styles.totpStack}>
                  <p class={styles.choiceTitle}>Clave de acceso</p>
                  <p class={styles.choiceDescription}>
                    Usa tu dispositivo para ingresar.
                  </p>
                  <Show
                    when={passkeyEnrollment.supported()}
                    fallback={
                      <p class={styles.configuredDescription}>
                        Este dispositivo no admite claves de acceso.
                      </p>
                    }
                  >
                    <Button
                      type="button"
                      onClick={() => {
                        void passkeyEnrollment.registerPasskey();
                      }}
                      disabled={passkeyEnrollment.loading()}
                    >
                      {currentUser.hasPasskey
                        ? "Agregar clave de acceso"
                        : "Configurar"}
                    </Button>
                  </Show>
                </div>
              </EnterTransition>
            </Show>

            <Show when={step() === "totp"}>
              <EnterTransition>
                <div class={styles.totpStack}>
                  <TotpMethodCard
                    title="Aplicación de autenticación"
                    description="Genera un código de 6 dígitos."
                    statusLabel={
                      currentUser.totpEnabled ? "Configurada" : "Configurar"
                    }
                    active={currentUser.totpEnabled}
                    loading={totpEnrollment.loading()}
                    actionLabel={
                      currentUser.totpEnabled ? "Configurada" : "Configurar"
                    }
                    code={totpEnrollment.code()}
                    enrollment={totpEnrollment.enrollment()}
                    onCodeChange={totpEnrollment.setCode}
                    onBegin={() => {
                      void totpEnrollment.beginEnrollment();
                    }}
                    onVerify={() => {
                      void totpEnrollment.verifyEnrollment();
                    }}
                  />

                  <Show when={totpEnrollment.recoveryCodes().length > 0}>
                    <RecoveryCodesPanel
                      title="Códigos de recuperación"
                      description="Guárdalos ahora."
                      codes={totpEnrollment.recoveryCodes()}
                    />
                  </Show>
                </div>
              </EnterTransition>
            </Show>
          </AuthFlowShell>
        </form>
      )}
    </Show>
  );
}

export default function OnboardingPage() {
  return (
    <SessionProvider>
      <OnboardingContent />
    </SessionProvider>
  );
}
