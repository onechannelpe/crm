import { useNavigate } from "@solidjs/router";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  completeOnboarding,
  finishPasskeyRegistration,
  finishTotpEnrollment,
  getMe,
} from "~/actions/auth";
import { useToast } from "~/components/feedback/toast-provider";
import Lock from "~/components/icons/lock";
import Phone from "~/components/icons/phone";
import ShieldCheck from "~/components/icons/shield-check";
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

function getTotpSetupKey(otpauthUri: string): string {
  try {
    return new URL(otpauthUri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

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
  const setupKey = () => {
    const enrollment = totpEnrollment();
    if (!enrollment) return "";
    return getTotpSetupKey(enrollment.otpauthUri);
  };

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
      showToast("error", getErrorMessage(err, "No se pudo completar el registro"));
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
      <section class={`${authStyles.panel} ${authStyles.panelXl} ${styles.panel}`}>
        <div class={styles.hero}>
          <p class={authStyles.eyebrow}>One Channel</p>
          <h1 class={authStyles.title}>Termina la configuración de tu cuenta</h1>
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
                      Los datos de identidad y rol vienen desde la invitación. Solo
                      necesitamos confirmar tu contacto principal.
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

                <div class={styles.securityBanner}>
                  <span class={styles.bannerTitle}>
                    {requiresStrongAuth()
                      ? "Necesitas una clave de acceso o una aplicación de autenticación."
                      : "Recomendado: configura al menos un método fuerte ahora."}
                  </span>
                  <span class={styles.bannerText}>
                    La clave de acceso funciona mejor para inicio rápido en este
                    dispositivo. La aplicación de autenticación sirve como opción
                    portátil y de respaldo.
                  </span>
                </div>

                <div class={styles.methodGrid}>
                  <article class={styles.methodCard}>
                    <div class={styles.methodHeader}>
                      <div class={styles.methodIcon}>
                        <Phone size={18} />
                      </div>
                      <div class={styles.methodCopy}>
                        <h3 class={styles.methodTitle}>Clave de acceso</h3>
                        <p class={styles.methodDescription}>
                          Usa biometría o el desbloqueo del dispositivo para entrar
                          sin escribir un código adicional.
                        </p>
                      </div>
                      <span
                        classList={{
                          [styles.statusPill]: true,
                          [styles.statusPillSuccess]: hasPasskey(),
                        }}
                      >
                        {hasPasskey()
                          ? `${passkeyCount()} configurada${passkeyCount() === 1 ? "" : "s"}`
                          : passkeySupported()
                            ? "Disponible"
                            : "No compatible"}
                      </span>
                    </div>

                    <div class={styles.methodActions}>
                      <Button
                        type="button"
                        variant={hasPasskey() ? "outline" : "primary"}
                        disabled={!passkeySupported() || passkeyLoading()}
                        loading={passkeyLoading()}
                        onClick={() => {
                          void handlePasskeySetup();
                        }}
                      >
                        {hasPasskey() ? "Añadir otra clave" : "Configurar clave"}
                      </Button>
                      <Show when={!passkeySupported()}>
                        <p class={styles.methodHint}>
                          Este navegador o dispositivo no admite claves de acceso.
                        </p>
                      </Show>
                    </div>
                  </article>

                  <article class={styles.methodCard}>
                    <div class={styles.methodHeader}>
                      <div class={styles.methodIcon}>
                        <ShieldCheck size={18} />
                      </div>
                      <div class={styles.methodCopy}>
                        <h3 class={styles.methodTitle}>Aplicación de autenticación</h3>
                        <p class={styles.methodDescription}>
                          Genera códigos de 6 dígitos con Authy, 1Password,
                          Microsoft Authenticator u otra aplicación compatible.
                        </p>
                      </div>
                      <span
                        classList={{
                          [styles.statusPill]: true,
                          [styles.statusPillSuccess]: totpEnabled(),
                        }}
                      >
                        {totpEnabled() ? "Configurada" : "No configurada"}
                      </span>
                    </div>

                    <div class={styles.methodActions}>
                      <Button
                        type="button"
                        variant={totpEnabled() ? "outline" : "primary"}
                        disabled={totpEnabled() || totpLoading()}
                        loading={totpLoading()}
                        onClick={() => {
                          void handleBeginTotp();
                        }}
                      >
                        {totpEnabled() ? "Ya configurada" : "Configurar aplicación"}
                      </Button>
                    </div>

                    <Show when={totpEnrollment()}>
                      {(enrollment) => (
                        <div class={styles.totpSetup}>
                          <div class={styles.qrPanel}>
                            <img
                              src={enrollment().qrCodeDataUrl}
                              alt="Código QR para autenticación"
                              class={styles.qr}
                            />
                          </div>
                          <div class={styles.totpDetails}>
                            <p class={styles.methodHint}>
                              Escanea el código QR con tu aplicación.
                            </p>
                            <Show when={setupKey()}>
                              <div class={styles.setupKeyBlock}>
                                <span class={styles.setupKeyLabel}>No puedes escanear?</span>
                                <Input
                                  type="text"
                                  label="Clave manual"
                                  value={setupKey()}
                                  disabled
                                />
                              </div>
                            </Show>
                            <div class={styles.verifyRow}>
                              <Input
                                id="onboarding-totp-code"
                                type="text"
                                label="Código de 6 dígitos"
                                placeholder="123456"
                                value={totpCode()}
                                onInput={(event) =>
                                  setTotpCode(event.currentTarget.value)
                                }
                              />
                              <Button
                                type="button"
                                disabled={totpLoading()}
                                onClick={() => {
                                  void handleVerifyTotp();
                                }}
                              >
                                Verificar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Show>
                  </article>
                </div>

                <Show when={recoveryCodes().length > 0}>
                  <div class={styles.recovery}>
                    <div class={styles.recoveryHeader}>
                      <h3 class={styles.recoveryTitle}>Códigos de recuperación</h3>
                      <p class={styles.recoveryDescription}>
                        Guárdalos ahora. Se muestran una sola vez y sirven como
                        respaldo si pierdes acceso a tu aplicación.
                      </p>
                    </div>
                    <div class={styles.recoveryList}>
                      <For each={recoveryCodes()}>
                        {(code) => <div class={styles.mono}>{code}</div>}
                      </For>
                    </div>
                  </div>
                </Show>
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
                  disabled={submitting() || (requiresStrongAuth() && !strongAuthConfigured())}
                >
                  {submitting() ? "Guardando..." : "Entrar al espacio de trabajo"}
                </Button>
              </div>
            </form>
          )}
        </Show>
      </section>
    </div>
  );
}
