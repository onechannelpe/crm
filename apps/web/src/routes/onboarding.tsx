import { useNavigate } from "@solidjs/router";
import { Show, createEffect, createSignal } from "solid-js";

import { completeOnboarding } from "~/actions/auth";
import { PasskeyMethodCard } from "~/components/auth/passkey-method-card";
import { RecoveryCodesPanel } from "~/components/auth/recovery-codes-panel";
import { TotpMethodCard } from "~/components/auth/totp-method-card";
import { usePasskeyEnrollment } from "~/components/auth/use-passkey-enrollment";
import { useTotpEnrollment } from "~/components/auth/use-totp-enrollment";
import { useToast } from "~/components/feedback/toast-provider";
import Lock from "~/components/icons/lock";
import UserRound from "~/components/icons/user-round";
import {
  SessionProvider,
  useSession,
} from "~/components/providers/session-provider";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getRoleLabel } from "~/lib/auth/access/role-display";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import type { PasswordLoginPolicy } from "~/lib/auth/security/auth-contract";
import { getErrorMessage } from "~/lib/errors";

import authStyles from "./auth/auth-shell.module.css";
import styles from "./onboarding-page.module.css";

type OnboardingStep = "profile" | "security";

function getSecurityTitle(passwordLoginPolicy: PasswordLoginPolicy) {
  if (passwordLoginPolicy === "passkey_only") {
    return "Ya tienes un método fuerte activo. Si luego quieres entrar con contraseña, añade también una aplicación de autenticación.";
  }
  if (passwordLoginPolicy === "password_or_totp") {
    return "Tu rol requiere un método fuerte para continuar. Si eliges entrar con contraseña, el segundo paso será un código TOTP.";
  }
  return "Puedes configurar la seguridad ahora o administrarla más tarde desde Configuración.";
}

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

  const requiresStrongAuth = () => Boolean(user()?.strongAuthRequired);
  const strongAuthConfigured = () => Boolean(user()?.strongAuthConfigured);
  const profileReady = () => phone().trim().length > 0;
  const securityReady = () => !requiresStrongAuth() || strongAuthConfigured();
  const canFinish = () => profileReady() && securityReady();

  function handleProfileContinue() {
    if (!profileReady()) {
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
                      [styles.summaryValueSuccess]: profileReady(),
                    }}
                  >
                    {profileReady() ? "Listo" : "Pendiente"}
                  </span>
                </div>
                <div class={styles.summaryItem}>
                  <span class={styles.summaryLabel}>Seguridad</span>
                  <span
                    classList={{
                      [styles.summaryValue]: true,
                      [styles.summaryValueSuccess]: strongAuthConfigured(),
                    }}
                  >
                    {strongAuthConfigured()
                      ? "Lista"
                      : requiresStrongAuth()
                        ? "Obligatoria"
                        : "Opcional"}
                  </span>
                </div>
              </div>

              <Show when={step() === "profile"}>
                <section class={styles.card}>
                  <div class={styles.cardHeader}>
                    <div class={styles.cardHeaderCopy}>
                      <span class={styles.cardStep}>Paso 1</span>
                      <h2 class={styles.cardTitle}>Perfil</h2>
                      <p class={styles.cardDescription}>
                        Los datos de identidad y rol vienen desde la invitación.
                        Solo necesitamos confirmar tu contacto principal.
                      </p>
                    </div>
                    <div class={styles.cardIcon}>
                      <UserRound size={18} />
                    </div>
                  </div>

                  <div class={styles.identityGrid}>
                    <Input
                      type="text"
                      label="Nombre"
                      value={`${currentUser.names} ${currentUser.firstSurname} ${currentUser.secondSurname}`}
                      disabled
                    />
                    <Input
                      type="text"
                      label="Rol"
                      value={getRoleLabel(currentUser.role)}
                      disabled
                    />
                    <Input
                      id="onboarding-email"
                      type="email"
                      label="Correo corporativo"
                      value={currentUser.email}
                      disabled
                    />
                    <Input
                      id="onboarding-phone"
                      type="tel"
                      label="WhatsApp corporativo"
                      placeholder="+51987654321"
                      value={phone()}
                      onInput={(event) => setPhone(event.currentTarget.value)}
                      required
                    />
                  </div>

                  <div class={styles.footer}>
                    <p class={styles.footerCopy}>
                      El siguiente paso define cómo vas a proteger el acceso a
                      tu cuenta.
                    </p>
                    <div class={styles.footerActions}>
                      <Button
                        type="button"
                        class={authStyles.full}
                        onClick={handleProfileContinue}
                      >
                        Continuar a seguridad
                      </Button>
                    </div>
                  </div>
                </section>
              </Show>

              <Show when={step() === "security"}>
                <section class={styles.card}>
                  <div class={styles.cardHeader}>
                    <div class={styles.cardHeaderCopy}>
                      <span class={styles.cardStep}>Paso 2</span>
                      <h2 class={styles.cardTitle}>Protege tu cuenta</h2>
                      <p class={styles.cardDescription}>
                        {getSecurityTitle(currentUser.passwordLoginPolicy)}
                      </p>
                    </div>
                    <div class={styles.cardIcon}>
                      <Lock size={18} />
                    </div>
                  </div>

                  <div class={styles.securityGrid}>
                    <PasskeyMethodCard
                      title="Clave de acceso"
                      description="Usa biometría o el desbloqueo del dispositivo para entrar sin contraseña desde dispositivos compatibles."
                      statusLabel={
                        currentUser.hasPasskey
                          ? `${currentUser.passkeyCount} configurada${currentUser.passkeyCount === 1 ? "" : "s"}`
                          : passkeyEnrollment.supported()
                            ? "Disponible"
                            : "No compatible"
                      }
                      active={currentUser.hasPasskey}
                      supported={passkeyEnrollment.supported()}
                      loading={passkeyEnrollment.loading()}
                      actionLabel={
                        currentUser.hasPasskey
                          ? "Añadir otra clave"
                          : "Configurar clave"
                      }
                      note={
                        currentUser.passwordLoginPolicy === "passkey_only"
                          ? "Con tu clave de acceso ya puedes terminar esta configuración."
                          : "Las claves de acceso son ideales para entrar sin contraseña."
                      }
                      unsupportedNote="Este navegador o dispositivo no admite claves de acceso."
                      onAction={() => {
                        void passkeyEnrollment.registerPasskey();
                      }}
                    />

                    <TotpMethodCard
                      title="Aplicación de autenticación"
                      description="Genera códigos de 6 dígitos con Authy, 1Password, Microsoft Authenticator u otra aplicación compatible."
                      statusLabel={
                        currentUser.totpEnabled
                          ? "Configurada"
                          : "No configurada"
                      }
                      active={currentUser.totpEnabled}
                      loading={totpEnrollment.loading()}
                      actionLabel={
                        currentUser.totpEnabled
                          ? "Ya configurada"
                          : "Configurar aplicación"
                      }
                      note="Si eliges entrar con contraseña en un rol protegido, este será el segundo paso."
                      code={totpEnrollment.code()}
                      enrollment={totpEnrollment.enrollment()}
                      onCodeInput={(event) =>
                        totpEnrollment.setCode(event.currentTarget.value)
                      }
                      onBegin={() => {
                        void totpEnrollment.beginEnrollment();
                      }}
                      onVerify={() => {
                        void totpEnrollment.verifyEnrollment();
                      }}
                    />
                  </div>

                  <Show when={totpEnrollment.recoveryCodes().length > 0}>
                    <RecoveryCodesPanel
                      title="Códigos de recuperación"
                      description="Guárdalos ahora. Se muestran una sola vez y sirven como respaldo si pierdes acceso a tu aplicación."
                      codes={totpEnrollment.recoveryCodes()}
                    />
                  </Show>
                </section>
              </Show>

              <div class={styles.footer}>
                <p class={styles.footerCopy}>
                  {step() === "profile"
                    ? "Confirma el contacto principal antes de pasar al paso de seguridad."
                    : requiresStrongAuth() && !strongAuthConfigured()
                      ? "Completa al menos un método fuerte para terminar la configuración."
                      : "Podrás administrar estos métodos más tarde desde Configuración > Seguridad."}
                </p>
                <div class={styles.footerActions}>
                  <Show when={step() === "security"}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("profile")}
                    >
                      Volver a perfil
                    </Button>
                  </Show>
                  <Show
                    when={step() === "security"}
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
                      disabled={submitting() || !canFinish()}
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
