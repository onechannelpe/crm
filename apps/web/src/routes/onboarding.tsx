import { useNavigate } from "@solidjs/router";
import { Show, createEffect, createMemo, createSignal } from "solid-js";

import { completeOnboarding } from "~/actions/auth";
import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { OnboardingProfileStep } from "~/components/auth/onboarding-profile-step";
import { OnboardingSecurityStep } from "~/components/auth/onboarding-security-step";
import { usePasskeyEnrollment } from "~/components/auth/use-passkey-enrollment";
import { useTotpEnrollment } from "~/components/auth/use-totp-enrollment";
import { useToast } from "~/components/feedback/toast-provider";
import {
  SessionProvider,
  useSession,
} from "~/components/providers/session-provider";
import { Button } from "~/components/ui/input/button";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  buildOnboardingProgress,
  deriveOnboardingState,
  isValidOnboardingPhone,
  type OnboardingStep,
} from "~/lib/auth/onboarding-flow";
import { getErrorMessage } from "~/lib/errors";

import styles from "./onboarding-page.module.css";

function OnboardingContent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, refreshCurrentUser } = useSession();
  const [phone, setPhone] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [step, setStep] = createSignal<OnboardingStep>("profile");
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
      requestedStep: step(),
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
    setStep("security");
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
            eyebrow="One Channel"
            title="Configura tu acceso de una vez"
            description="Usaremos este recorrido para dejar lista tu cuenta. Primero validas tu contacto y luego eliges cómo proteger tu ingreso al espacio de trabajo."
            railNote={
              currentUser.strongAuthRequired
                ? "Tu rol exige al menos un método fuerte antes de terminar."
                : "La seguridad es opcional en este rol, pero puedes dejarla configurada ahora."
            }
            progress={buildOnboardingProgress(onboardingState())}
            contentEyebrow={
              onboardingState().currentStep === "profile" ? "Paso 1" : "Paso 2"
            }
            contentTitle={
              onboardingState().currentStep === "profile"
                ? "Confirma tu perfil"
                : "Protege tu cuenta"
            }
            contentDescription={
              onboardingState().currentStep === "profile"
                ? "Este paso solo confirma el canal principal que usaremos para alertas, soporte y notificaciones de seguridad."
                : "Elige el método que usarás para entrar y completar el segundo paso cuando corresponda."
            }
            footer={
              <>
                <p class={styles.footerCopy}>
                  {onboardingState().currentStep === "profile"
                    ? "Cuando el WhatsApp esté listo, pasarás al paso de seguridad."
                    : currentUser.strongAuthRequired &&
                        !currentUser.strongAuthConfigured
                      ? "Completa al menos un método fuerte para terminar esta configuración."
                      : "Después podrás gestionar estos métodos desde Configuración > Seguridad."}
                </p>
                <div class={styles.footerActions}>
                  <Show when={onboardingState().currentStep === "security"}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("profile")}
                    >
                      Volver
                    </Button>
                  </Show>
                  <Show
                    when={onboardingState().currentStep === "security"}
                    fallback={
                      <Button type="button" onClick={handleProfileContinue}>
                        Continuar
                      </Button>
                    }
                  >
                    <Button
                      type="submit"
                      disabled={submitting() || !onboardingState().canFinish}
                    >
                      {submitting()
                        ? "Guardando..."
                        : "Entrar al espacio de trabajo"}
                    </Button>
                  </Show>
                </div>
              </>
            }
          >
            <Show when={onboardingState().currentStep === "profile"}>
              <OnboardingProfileStep
                email={currentUser.email}
                fullName={`${currentUser.names} ${currentUser.firstSurname} ${currentUser.secondSurname}`}
                phone={phone()}
                role={currentUser.role}
                onPhoneInput={setPhone}
              />
            </Show>

            <Show when={onboardingState().currentStep === "security"}>
              <OnboardingSecurityStep
                currentUser={currentUser}
                passkeyEnrollment={passkeyEnrollment}
                totpEnrollment={totpEnrollment}
              />
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
