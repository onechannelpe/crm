import { Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { OnboardingProfileStep } from "~/components/auth/onboarding-profile-step";
import { OnboardingSecurityStep } from "~/components/auth/onboarding-security-step";
import { PasskeyMethodCard } from "~/components/auth/passkey-method-card";
import { RecoveryCodesPanel } from "~/components/auth/recovery-codes-panel";
import { TotpMethodCard } from "~/components/auth/totp-method-card";
import { SessionProvider } from "~/components/providers/session-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import {
  useOnboardingFlow,
  type OnboardingView,
} from "~/lib/auth/use-onboarding-flow";

import styles from "./onboarding-page.module.css";

function OnboardingProgress(props: { step: OnboardingView }) {
  const percent = () => (props.step === "profile" ? 50 : 100);
  return (
    <div
      class={styles.progressTrack}
      role="progressbar"
      aria-valuenow={percent()}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progreso del registro"
    >
      <div class={styles.progressFill} style={{ width: `${percent()}%` }} />
    </div>
  );
}

function OnboardingContent() {
  const flow = useOnboardingFlow();

  const title = () => {
    if (flow.step() === "profile") return "Perfil";
    if (flow.step() === "security-choice") return "Seguridad";
    if (flow.step() === "passkey") return "Clave de acceso";
    return "Aplicación de autenticación";
  };

  return (
    <Show when={flow.user()} keyed>
      {(currentUser) => (
        <form
          onSubmit={(event) => {
            void flow.handleSubmit(event);
          }}
        >
          <AuthFlowShell
            title={title()}
            footer={
              <div class={styles.footerActions}>
                <Show when={flow.step() !== "profile"}>
                  <Button type="button" variant="ghost" onClick={flow.goBack}>
                    Atrás
                  </Button>
                </Show>
                <Show
                  when={flow.step() === "profile"}
                  fallback={
                    <Show when={flow.step() !== "security-choice"}>
                      <Button
                        type="submit"
                        disabled={
                          flow.submitting() || !flow.onboardingState().canFinish
                        }
                      >
                        {flow.submitting() ? "Guardando..." : "Finalizar"}
                      </Button>
                    </Show>
                  }
                >
                  <Button type="button" onClick={flow.handleProfileContinue}>
                    Continuar
                  </Button>
                </Show>
              </div>
            }
          >
            <OnboardingProgress step={flow.step()} />

            <Show when={flow.step() === "profile"}>
              <EnterTransition>
                <OnboardingProfileStep
                  email={currentUser.email}
                  fullName={`${currentUser.names} ${currentUser.firstSurname} ${currentUser.secondSurname}`}
                  phone={flow.phone()}
                  role={currentUser.role}
                  onPhoneInput={flow.setPhone}
                />
              </EnterTransition>
            </Show>

            <Show when={flow.step() === "security-choice"}>
              <EnterTransition>
                <OnboardingSecurityStep
                  hasPasskey={currentUser.hasPasskey}
                  totpEnabled={currentUser.totpEnabled}
                  onSelectMethod={(value) =>
                    flow.setStep(value === "passkey" ? "passkey" : "totp")
                  }
                />
              </EnterTransition>
            </Show>

            <Show when={flow.step() === "passkey"}>
              <EnterTransition>
                <div class={styles.totpStack}>
                  <PasskeyMethodCard
                    title="Clave de acceso"
                    description="Entra con tu dispositivo sin contraseña."
                    statusLabel={
                      currentUser.hasPasskey ? "Configurada" : "No configurada"
                    }
                    active={currentUser.hasPasskey}
                    supported={flow.passkeyEnrollment.supported()}
                    loading={flow.passkeyEnrollment.loading()}
                    actionLabel={
                      currentUser.hasPasskey ? "Agregar otra" : "Configurar"
                    }
                    unsupportedNote="Este dispositivo no es compatible con claves de acceso."
                    onAction={() => {
                      void flow.passkeyEnrollment.registerPasskey();
                    }}
                  />
                </div>
              </EnterTransition>
            </Show>

            <Show when={flow.step() === "totp"}>
              <EnterTransition>
                <div class={styles.totpStack}>
                  <TotpMethodCard
                    title="Aplicación de autenticación"
                    description="Genera códigos temporales para confirmar tu acceso."
                    statusLabel={
                      currentUser.totpEnabled ? "Configurada" : "No configurada"
                    }
                    active={currentUser.totpEnabled}
                    loading={flow.totpEnrollment.loading()}
                    actionLabel={
                      currentUser.totpEnabled ? "Reconfigurar" : "Configurar"
                    }
                    code={flow.totpEnrollment.code()}
                    enrollment={flow.totpEnrollment.enrollment()}
                    onCodeChange={flow.totpEnrollment.setCode}
                    onBegin={() => {
                      void flow.totpEnrollment.beginEnrollment();
                    }}
                    onVerify={() => {
                      void flow.totpEnrollment.verifyEnrollment();
                    }}
                  />

                  <Show when={flow.totpEnrollment.recoveryCodes().length > 0}>
                    <RecoveryCodesPanel
                      title="Códigos de recuperación"
                      description="Guárdalos en un lugar seguro."
                      codes={flow.totpEnrollment.recoveryCodes()}
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
