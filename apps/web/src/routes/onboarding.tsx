import { Show, Suspense } from "solid-js";

import { AuthFlowShell } from "~/features/auth/ui/auth-flow-shell";
import { OtpSlotInput } from "~/features/auth/ui/otp-slot-input";
import { RecoveryCodesPanel } from "~/features/auth/security/recovery-codes-panel";
import { Loader } from "~/components/feedback/loading/loader";
import { OnboardingProfileStep } from "~/features/onboarding/ui/onboarding-profile-step";
import { OnboardingSecurityStep } from "~/features/onboarding/ui/onboarding-security-step";
import { SessionProvider } from "~/components/providers/session-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import {
  useOnboardingFlow,
  type OnboardingView,
} from "~/features/onboarding/services/use-onboarding-flow";

import styles from "~/features/onboarding/ui/onboarding-page.module.css";

function OnboardingProgress(props: { step: OnboardingView }) {
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
        <Show
          when={flow.pendingCreationLoaderStep() !== "none"}
          fallback={
            <form
              onSubmit={(event) => {
                void flow.handleSubmit(event);
              }}
            >
              <AuthFlowShell
                topBar={<OnboardingProgress step={flow.step()} />}
                title={title()}
                footer={
                  <div class={styles.footerActions}>
                    <Show when={flow.step() !== "profile"}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={flow.goBack}
                        disabled={!flow.canGoBack()}
                      >
                        Atrás
                      </Button>
                    </Show>
                    <Show
                      when={flow.step() === "profile"}
                      fallback={
                        <Show
                          when={
                            flow.step() === "security-choice" &&
                            flow.onboardingState().canFinishWithoutSecurity
                          }
                          fallback={
                            <Show when={flow.step() === "totp"}>
                              <Button
                                type="submit"
                                loading={flow.submitting()}
                                disabled={
                                  flow.submitting() ||
                                  !flow.onboardingState().canFinish
                                }
                              >
                                Finalizar
                              </Button>
                            </Show>
                          }
                        >
                          <Button
                            type="submit"
                            loading={flow.submitting()}
                            disabled={flow.submitting()}
                          >
                            Finalizar
                          </Button>
                        </Show>
                      }
                    >
                      <Button
                        type="button"
                        onClick={flow.handleProfileContinue}
                      >
                        Continuar
                      </Button>
                    </Show>
                  </div>
                }
              >
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
                      securityRequired={flow.onboardingState().securityRequired}
                      onSelectPasskey={flow.handlePasskeySelection}
                      onSelectTotp={() => flow.setStep("totp")}
                    />
                  </EnterTransition>
                </Show>

                <Show when={flow.step() === "passkey"}>
                  <EnterTransition>
                    <div class={styles.passkeyEnrollStep}>
                      <Show when={flow.passkeyPhase() === "device"}>
                        <p class={styles.passkeyStatus}>
                          Esperando tu dispositivo...
                        </p>
                      </Show>

                      <Show when={flow.passkeyPhase() === "server"}>
                        <p class={styles.passkeyStatus}>
                          Guardando tu registro...
                        </p>
                      </Show>

                      <Show
                        when={
                          flow.passkeyPhase() === "idle" &&
                          !currentUser.hasPasskey &&
                          flow.passkeySupported()
                        }
                      >
                        <Button
                          type="button"
                          onClick={() =>
                            void flow.registerPasskeyAndFinishOnboarding()
                          }
                        >
                          Reintentar
                        </Button>
                      </Show>

                      <Show
                        when={
                          flow.passkeyPhase() === "idle" &&
                          !flow.passkeySupported()
                        }
                      >
                        <p class={styles.passkeyStatus}>
                          Este dispositivo no es compatible con claves de
                          acceso.
                        </p>
                      </Show>
                    </div>
                  </EnterTransition>
                </Show>

                <Show when={flow.step() === "totp"}>
                  <EnterTransition>
                    <div class={styles.totpStack}>
                      <Show
                        when={flow.totpEnrollment.enrollment()}
                        fallback={
                          <Show when={flow.totpEnrollment.loading()}>
                            <p class={styles.passkeyStatus}>
                              Generando código QR...
                            </p>
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
                                  {new URL(
                                    enrollment().otpauthUri,
                                  ).searchParams.get("secret")}
                                </span>
                              </div>
                            </details>
                            <OtpSlotInput
                              value={flow.totpEnrollment.code()}
                              disabled={flow.totpEnrollment.loading()}
                              onValueChange={flow.totpEnrollment.setCode}
                            />
                            <Button
                              type="button"
                              disabled={
                                flow.totpEnrollment.loading() ||
                                flow.totpEnrollment.code().length < 6
                              }
                              loading={flow.totpEnrollment.loading()}
                              onClick={() =>
                                void flow.totpEnrollment.verifyEnrollment()
                              }
                            >
                              Verificar
                            </Button>
                          </div>
                        )}
                      </Show>

                      <Show
                        when={
                          currentUser.totpEnabled &&
                          !flow.totpEnrollment.enrollment()
                        }
                      >
                        <p class={styles.passkeyStatusConfigured}>
                          App de autenticación configurada.
                        </p>
                      </Show>

                      <Show
                        when={flow.totpEnrollment.recoveryCodes().length > 0}
                      >
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
          }
        >
          <AuthFlowShell title="Creando tu espacio de trabajo">
            <div class={styles.pendingCreationLoader}>
              <Show when={flow.pendingCreationLoaderStep() === "step-1"}>
                <p class={styles.pendingCreationLabel}>
                  Configurando tu base de datos...
                </p>
              </Show>
              <Show when={flow.pendingCreationLoaderStep() === "step-2"}>
                <p class={styles.pendingCreationLabel}>
                  Creando tu modelo de datos...
                </p>
              </Show>
              <Show when={flow.pendingCreationLoaderStep() === "step-3"}>
                <p class={styles.pendingCreationLabel}>
                  Precargando datos de tu espacio...
                </p>
              </Show>
              <output class={styles.loadingStack} aria-live="polite">
                <Loader />
              </output>
            </div>
          </AuthFlowShell>
        </Show>
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
