import { useNavigate } from "@solidjs/router";
import { createEffect, createResource, createSignal, Show } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  completeOnboarding,
  finishPasskeyRegistration,
  finishTotpEnrollment,
  getMe,
} from "~/actions/auth";
import { SecurityEnrollmentPanel } from "~/components/auth/security-enrollment-panel";
import { useToast } from "~/components/feedback/toast-provider";
import Lock from "~/components/icons/lock";
import UserRound from "~/components/icons/user-round";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getRoleLabel } from "~/lib/auth/access/role-display";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  isPasskeySupported,
  toCreationOptions,
  toRegistrationPayload,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

import authStyles from "./auth/auth-shell.module.css";
import styles from "./onboarding-page.module.css";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, { refetch: refetchUser }] = createResource(getMe);
  const [phone, setPhone] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [totpEnrollment, setTotpEnrollment] = createSignal<{
    qrCodeDataUrl: string;
    otpauthUri: string;
  } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);

  createEffect(() => {
    const currentUser = user();
    if (!currentUser) return;
    if (!phone() && currentUser.phoneE164) {
      setPhone(currentUser.phoneE164);
    }
  });

  createEffect(() => {
    setPasskeySupported(isPasskeySupported());
  });

  const requiresStrongAuth = () => Boolean(user()?.strongAuthRequired);
  const strongAuthConfigured = () => Boolean(user()?.strongAuthConfigured);
  const totpEnabled = () => Boolean(user()?.totpEnabled);
  const hasPasskey = () => Boolean(user()?.hasPasskey);
  const passkeyCount = () => user()?.passkeyCount ?? 0;

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

  async function handlePasskeySetup() {
    setPasskeyLoading(true);
    try {
      const { challengeId, options } = await beginPasskeyRegistration();
      const creationOptions = toCreationOptions(options);
      const credential = await navigator.credentials.create({
        publicKey: creationOptions,
      });

      if (!credential || !(credential instanceof PublicKeyCredential)) {
        throw new Error("No se pudo crear la clave de acceso");
      }

      await finishPasskeyRegistration(
        challengeId,
        toRegistrationPayload(credential),
      );
      await refetchUser();
      showToast("success", "Clave de acceso configurada");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo configurar la clave de acceso"),
      );
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleBeginTotp() {
    setTotpLoading(true);
    try {
      const enrollment = await beginTotpEnrollment();
      setTotpEnrollment(enrollment);
      showToast("info", "Escanea el QR y verifica el código de 6 dígitos");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo iniciar la configuración del 2FA"),
      );
    } finally {
      setTotpLoading(false);
    }
  }

  async function handleVerifyTotp() {
    setTotpLoading(true);
    try {
      const codes = await finishTotpEnrollment(totpCode());
      setRecoveryCodes(codes);
      setTotpEnrollment(null);
      setTotpCode("");
      await refetchUser();
      showToast("success", "Aplicación de autenticación configurada");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "Código de verificación inválido"),
      );
    } finally {
      setTotpLoading(false);
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
            Primero confirma tu perfil. Luego protege el acceso con una clave de
            acceso o una aplicación de autenticación.
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
                  <span class={styles.summaryValue}>Pendiente</span>
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
              </section>

              <section class={styles.card}>
                <div class={styles.cardHeader}>
                  <div class={styles.cardHeaderCopy}>
                    <span class={styles.cardStep}>Paso 2</span>
                    <h2 class={styles.cardTitle}>Protege tu cuenta</h2>
                    <p class={styles.cardDescription}>
                      {requiresStrongAuth()
                        ? "Tu rol exige al menos un método de autenticación fuerte antes de continuar."
                        : "Puedes configurarlo ahora o más tarde desde Configuración."}
                    </p>
                  </div>
                  <div class={styles.cardIcon}>
                    <Lock size={18} />
                  </div>
                </div>

                <SecurityEnrollmentPanel
                  mode="onboarding"
                  strongAuthRequired={requiresStrongAuth()}
                  strongAuthConfigured={strongAuthConfigured()}
                  passkeySupported={passkeySupported()}
                  hasPasskey={hasPasskey()}
                  passkeyCount={passkeyCount()}
                  passkeyLoading={passkeyLoading()}
                  totpEnabled={totpEnabled()}
                  totpLoading={totpLoading()}
                  totpCode={totpCode()}
                  totpEnrollment={totpEnrollment()}
                  recoveryCodes={recoveryCodes()}
                  onTotpCodeInput={(event) =>
                    setTotpCode(event.currentTarget.value)
                  }
                  onRegisterPasskey={() => {
                    void handlePasskeySetup();
                  }}
                  onBeginTotp={() => {
                    void handleBeginTotp();
                  }}
                  onVerifyTotp={() => {
                    void handleVerifyTotp();
                  }}
                />
              </section>

              <div class={styles.footer}>
                <p class={styles.footerCopy}>
                  {requiresStrongAuth() && !strongAuthConfigured()
                    ? "Completa al menos un método de seguridad para continuar."
                    : "Podrás administrar estos métodos más tarde desde Configuración > Seguridad."}
                </p>
                <Button
                  type="submit"
                  class={authStyles.full}
                  disabled={
                    submitting() ||
                    (requiresStrongAuth() && !strongAuthConfigured())
                  }
                >
                  {submitting()
                    ? "Guardando..."
                    : "Entrar al espacio de trabajo"}
                </Button>
              </div>
            </form>
          )}
        </Show>
      </section>
    </div>
  );
}
