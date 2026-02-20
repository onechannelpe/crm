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
import { Card } from "~/components/ui/layout/card";
import { getErrorMessage } from "~/lib/errors";

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
          "Debes configurar TOTP antes de activar una cuenta administrativa.",
        );
      }
      await completeOnboarding(fullName(), phone());
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "No se pudo completar el onboarding"));
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
      setTotpMessage("Escanea el QR y confirma con tu código TOTP.");
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "No se pudo iniciar TOTP"));
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
      setTotpMessage("TOTP activado. Guarda tus códigos de recuperación.");
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Código TOTP inválido"));
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div class="crm-shell grid min-h-screen items-center justify-center px-4">
      <Card class="w-full max-w-xl p-6 space-y-5">
        <div>
          <h1 class="text-2xl font-semibold text-foreground">
            Completa tu perfil
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Para continuar debes confirmar tus datos y registrar tu número
            principal.
          </p>
        </div>

        <Show when={user()}>
          {(currentUser) => (
            <form
              class="space-y-4"
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
            >
              <div class="space-y-2">
                <Input
                  id="onboarding-email"
                  type="email"
                  label="Correo"
                  value={currentUser().email}
                  disabled
                />
              </div>

              <div class="space-y-2">
                <Input
                  id="onboarding-name"
                  type="text"
                  label="Nombre completo"
                  value={fullName()}
                  onInput={(e) => setFullName(e.currentTarget.value)}
                  required
                />
              </div>

              <div class="space-y-2">
                <Input
                  id="onboarding-phone"
                  type="tel"
                  label="WhatsApp (E.164, ejemplo +51987654321)"
                  value={phone()}
                  onInput={(e) => setPhone(e.currentTarget.value)}
                  required
                />
              </div>

              <Show when={requiresStrongAuth()}>
                <div class="space-y-3 rounded-2xl border border-border/85 bg-surface p-3">
                  <p class="text-sm font-medium text-foreground">
                    Configuración obligatoria de seguridad (TOTP)
                  </p>
                  <Show when={strongAuthIsEnrolled()}>
                    <p class="text-sm text-muted-foreground">
                      TOTP habilitado.
                    </p>
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
                      {totpLoading() ? "Preparando TOTP..." : "Configurar TOTP"}
                    </Button>
                    <Show when={totpQrCode()}>
                      <div class="space-y-2">
                        <img
                          src={totpQrCode()}
                          alt="QR TOTP"
                          class="w-48 h-48"
                        />
                        <Input
                          id="onboarding-totp-code"
                          type="text"
                          placeholder="Ingresa código TOTP"
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
                          Confirmar TOTP
                        </Button>
                      </div>
                    </Show>
                  </Show>
                  <Show when={totpMessage()}>
                    <p class="text-sm text-muted-foreground">{totpMessage()}</p>
                  </Show>
                  <Show when={recoveryCodes().length > 0}>
                    <div class="rounded-xl border border-border/80 bg-card p-3 space-y-2">
                      <p class="text-sm font-medium">
                        Códigos de recuperación (solo una vez)
                      </p>
                      <ul class="grid grid-cols-2 gap-2 text-sm">
                        {recoveryCodes().map((code) => (
                          <li class="font-mono">{code}</li>
                        ))}
                      </ul>
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={error()}>
                <p class="text-sm text-destructive">{error()}</p>
              </Show>

              <Button type="submit" class="w-full" disabled={submitting()}>
                {submitting() ? "Guardando..." : "Guardar y continuar"}
              </Button>
            </form>
          )}
        </Show>
      </Card>
    </div>
  );
}
