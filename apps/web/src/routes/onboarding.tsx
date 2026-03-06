import { useNavigate } from "@solidjs/router";
import { Show, createEffect, createMemo, createSignal } from "solid-js";

import { completeOnboarding } from "~/actions/auth";
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
  deriveOnboardingState,
  type OnboardingStep,
} from "~/lib/auth/onboarding-flow";
import { getErrorMessage } from "~/lib/errors";

import authStyles from "./auth/auth-shell.module.css";
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
    if (!onboardingState().profileReady) {
      showToast("error", "Ingresa un WhatsApp corporativo válido");
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
    <div class={authStyles.shellGrid}>
      <section
        class={`${authStyles.panel} ${authStyles.panelXl} ${styles.panel}`}
      >
        <div class={styles.hero}>
          <p class={authStyles.eyebrow}>One Channel</p>
          <h1 class={authStyles.title}>
            Termina la configuración de tu cuenta
          </h1>
          <p class={authStyles.muted}>
            Primero confirma tu perfil. Luego define cómo vas a proteger el
            acceso: clave de acceso para entrar sin contraseña o aplicación de
            autenticación para el flujo con contraseña.
          </p>
        </div>

        <Show when={user()} keyed>
          {(currentUser) => (
            <form
              class={styles.form}
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            >
              <div class={styles.summary}>
                <div class={styles.summaryItem}>
                  <span class={styles.summaryLabel}>Perfil</span>
                  <span
                    classList={{
                      [styles.summaryValue]: true,
                      [styles.summaryValueSuccess]:
                        onboardingState().profileReady,
                    }}
                  >
                    {onboardingState().profileReady ? "Listo" : "Pendiente"}
                  </span>
                </div>
                <div class={styles.summaryItem}>
                  <span class={styles.summaryLabel}>Seguridad</span>
                  <span
                    classList={{
                      [styles.summaryValue]: true,
                      [styles.summaryValueSuccess]:
                        user()?.strongAuthConfigured ?? false,
                    }}
                  >
                    {user()?.strongAuthConfigured
                      ? "Lista"
                      : user()?.strongAuthRequired
                        ? "Obligatoria"
                        : "Opcional"}
                  </span>
                </div>
              </div>

              <Show when={onboardingState().currentStep === "profile"}>
                <OnboardingProfileStep
                  email={currentUser.email}
                  fullName={`${currentUser.names} ${currentUser.firstSurname} ${currentUser.secondSurname}`}
                  phone={phone()}
                  role={currentUser.role}
                  onContinue={handleProfileContinue}
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

              <div class={styles.footer}>
                <p class={styles.footerCopy}>
                  {onboardingState().currentStep === "profile"
                    ? "Confirma el contacto principal antes de pasar al paso de seguridad."
                    : user()?.strongAuthRequired &&
                        !user()?.strongAuthConfigured
                      ? "Completa al menos un método fuerte para terminar la configuración."
                      : "Podrás administrar estos métodos más tarde desde Configuración > Seguridad."}
                </p>
                <div class={styles.footerActions}>
                  <Show when={onboardingState().currentStep === "security"}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("profile")}
                    >
                      Volver a perfil
                    </Button>
                  </Show>
                  <Show
                    when={onboardingState().currentStep === "security"}
                    fallback={
                      <Button
                        type="button"
                        class={authStyles.full}
                        onClick={handleProfileContinue}
                      >
                        Continuar a seguridad
                      </Button>
                    }
                  >
                    <Button
                      type="submit"
                      class={authStyles.full}
                      disabled={submitting() || !onboardingState().canFinish}
                    >
                      {submitting()
                        ? "Guardando..."
                        : "Entrar al espacio de trabajo"}
                    </Button>
                  </Show>
                </div>
              </div>
            </form>
          )}
        </Show>
      </section>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <SessionProvider>
      <OnboardingContent />
    </SessionProvider>
  );
}
