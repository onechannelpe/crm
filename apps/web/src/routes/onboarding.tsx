import { useNavigate } from "@solidjs/router";
import { createEffect, createResource, createSignal, Show } from "solid-js";

import {
  beginTotpEnrollment,
  completeOnboarding,
  finishTotpEnrollment,
  getMe,
} from "~/actions/auth";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { getErrorMessage } from "~/lib/errors";

import authStyles from "./auth/auth-shell.module.css";
import styles from "./onboarding-page.module.css";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [user, { refetch: refetchUser }] = createResource(getMe);
  const [fullName, setFullName] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [totpQrCode, setTotpQrCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const [totpMessage, setTotpMessage] = createSignal("");
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const requiresStrongAuth = () => {
    const currentUser = user();
    if (!currentUser) return false;
    return currentUser.strongAuthRequired;
  };

  const strongAuthIsEnrolled = () => {
    const currentUser = user();
    if (!currentUser) return false;
    return currentUser.strongAuthEnrolledAt !== null;
  };

  createEffect(() => {
    const currentUser = user();
    if (!currentUser) return;
    if (!fullName()) setFullName(currentUser.fullName);
    if (!phone() && currentUser.phoneE164) setPhone(currentUser.phoneE164);
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (requiresStrongAuth() && !strongAuthIsEnrolled()) {
        throw new Error(
          "Debes configurar el 2FA (TOTP) antes de activar una cuenta administrativa",
        );
      }
      const currentUser = user();
      if (!currentUser) {
        throw new Error("No se encontró la sesión");
      }
      await completeOnboarding(fullName(), phone());
      navigate(getDefaultAppPath(currentUser.role));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "No se pudo completar el registro."));
    } finally {
      setSubmitting(false);
    }
  }

  async function startTotpSetup() {
    setTotpMessage("");
    setTotpLoading(true);
    try {
      const enrollment = await beginTotpEnrollment();
      setTotpQrCode(enrollment.qrCodeDataUrl);
      setTotpMessage(
        "Escena el código QR y confirma con tu código de verificación.",
      );
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Código de verificación inválido"));
    } finally {
      setTotpLoading(false);
    }
  }

  async function confirmTotpSetup() {
    setTotpMessage("");
    setTotpLoading(true);
    try {
      const codes = await finishTotpEnrollment(totpCode());
      setRecoveryCodes(codes);
      setTotpQrCode("");
      setTotpCode("");
      await refetchUser();
      setTotpMessage("2FA (TOTP) activado. Guarda tus códigos de verificación");
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Código de verificación inválido"));
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div class={authStyles.shellGrid}>
      <section
        class={`${authStyles.panel} ${authStyles.panelXl} ${styles.panel}`}
      >
        <div>
          <h1 class={authStyles.title}>Completa tu perfil</h1>
          <p class={authStyles.muted}>
            Confirma los detalles de perfil y tu número de teléfono corporativo.
          </p>
        </div>

        <Show when={user()}>
          {(currentUser) => (
            <form
              class={styles.form}
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
            >
              <div class={styles.section}>
                <Input
                  id="onboarding-email"
                  type="email"
                  label="Correo"
                  value={currentUser().email}
                  disabled
                />
              </div>

              <div class={styles.section}>
                <Input
                  id="onboarding-name"
                  type="text"
                  label="Nombre completo"
                  value={fullName()}
                  onInput={(e) => setFullName(e.currentTarget.value)}
                  required
                />
              </div>

              <div class={styles.section}>
                <Input
                  id="onboarding-phone"
                  type="tel"
                  label="WhatsApp (ej: +51987654321)"
                  value={phone()}
                  onInput={(e) => setPhone(e.currentTarget.value)}
                  required
                />
              </div>

              <Show when={requiresStrongAuth()}>
                <div class={styles.totpBox}>
                  <p class={styles.totpTitle}>
                    Configuración de seguridad obligatoria (TOTP)
                  </p>
                  <Show when={strongAuthIsEnrolled()}>
                    <p class={authStyles.muted}>2FA (TOTP) activado.</p>
                  </Show>
                  <Show when={!strongAuthIsEnrolled()}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={totpLoading()}
                      onClick={() => {
                        void startTotpSetup();
                      }}
                    >
                      {totpLoading()
                        ? "Preparando 2FA..."
                        : "Configurar 2FA (TOTP)"}
                    </Button>
                    <Show when={totpQrCode()}>
                      <div class={styles.section}>
                        <img
                          src={totpQrCode()}
                          alt="Código QR para 2FA (TOTP)"
                          class={styles.qr}
                        />
                        <Input
                          id="onboarding-totp-code"
                          type="text"
                          placeholder="Ingresa el código de verificación"
                          value={totpCode()}
                          onInput={(e) => setTotpCode(e.currentTarget.value)}
                        />
                        <Button
                          type="button"
                          disabled={totpLoading()}
                          onClick={() => {
                            void confirmTotpSetup();
                          }}
                        >
                          Confirmar
                        </Button>
                      </div>
                    </Show>
                  </Show>
                  <Show when={totpMessage()}>
                    <p class={authStyles.muted}>{totpMessage()}</p>
                  </Show>
                  <Show when={recoveryCodes().length > 0}>
                    <div class={styles.recovery}>
                      <p class={styles.recoveryTitle}>
                        Códigos de recuperación (se muestran una sola vez)
                      </p>
                      <ul class={styles.recoveryList}>
                        {recoveryCodes().map((code) => (
                          <li class={styles.mono}>{code}</li>
                        ))}
                      </ul>
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={error()}>
                <p class={styles.error}>{error()}</p>
              </Show>

              <Button
                type="submit"
                class={authStyles.full}
                disabled={submitting()}
              >
                {submitting() ? "Guardando..." : "Guardar y continuar"}
              </Button>
            </form>
          )}
        </Show>
      </section>
    </div>
  );
}
