import { createResource, createSignal, onMount, Show } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  finishPasskeyRegistration,
  finishTotpEnrollment,
  getTotpStatus,
} from "~/actions/auth";
import { getMe } from "~/actions/auth-session";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";
import {
  isPasskeySupported,
  toCreationOptions,
  toRegistrationPayload,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

export default function ProfilePage() {
  const [user] = createResource(getMe);
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [passkeyMessage, setPasskeyMessage] = createSignal("");
  const [totpStatus, { refetch: refetchTotp }] = createResource(getTotpStatus);
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [totpMessage, setTotpMessage] = createSignal("");
  const [totpQrCode, setTotpQrCode] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);

  onMount(() => {
    setPasskeySupported(isPasskeySupported());
  });

  async function registerPasskey() {
    setPasskeyMessage("");
    setPasskeyLoading(true);
    try {
      const challenge = await beginPasskeyRegistration();
      const credential = await navigator.credentials.create({
        publicKey: toCreationOptions(challenge.options),
      });
      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("No se obtuvo una credencial válida");
      }

      const payload = toRegistrationPayload(credential);
      await finishPasskeyRegistration(challenge.challengeId, payload);
      setPasskeyMessage("Passkey registrada correctamente");
    } catch (err: unknown) {
      setPasskeyMessage(
        getErrorMessage(err, "No se pudo completar el registro de passkey"),
      );
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function startTotpSetup() {
    setTotpMessage("");
    setTotpLoading(true);
    try {
      const enrollment = await beginTotpEnrollment();
      setTotpQrCode(enrollment.qrCodeDataUrl);
      setTotpMessage("Escanea el QR y confirma con tu código TOTP");
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
      setTotpMessage("TOTP activado. Guarda los códigos de recuperación.");
      await refetchTotp();
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Código TOTP inválido"));
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p class="mt-1 text-sm text-gray-500">
          Datos de tu sesión y permisos actuales.
        </p>
      </div>

      <Show
        when={user()}
        fallback={
          <Card class="p-6 text-sm text-muted-foreground">
            Cargando perfil...
          </Card>
        }
      >
        {(currentUser) => (
          <Card class="p-6 space-y-4">
            <div>
              <p class="text-xs uppercase tracking-wider text-muted-foreground">
                Nombre
              </p>
              <p class="text-base font-medium text-foreground">
                {currentUser().fullName}
              </p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wider text-muted-foreground">
                Correo
              </p>
              <p class="text-base text-foreground">{currentUser().email}</p>
            </div>
            <div class="flex items-center justify-between">
              <p class="text-xs uppercase tracking-wider text-muted-foreground">
                Rol actual
              </p>
              <Badge variant={getRoleBadgeVariant(currentUser().role)}>
                {getRoleLabel(currentUser().role)}
              </Badge>
            </div>
            <div class="border-t pt-4 space-y-3">
              <p class="text-xs uppercase tracking-wider text-muted-foreground">
                Seguridad
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={!passkeySupported() || passkeyLoading()}
                onClick={() => {
                  void registerPasskey();
                }}
              >
                {passkeyLoading()
                  ? "Registrando passkey..."
                  : "Registrar passkey"}
              </Button>
              <Show when={!passkeySupported()}>
                <p class="text-sm text-muted-foreground">
                  Este dispositivo o navegador no soporta passkeys.
                </p>
              </Show>
              <Show when={passkeyMessage()}>
                <p class="text-sm text-muted-foreground">{passkeyMessage()}</p>
              </Show>
              <div class="space-y-3 border-t pt-3">
                <p class="text-xs uppercase tracking-wider text-muted-foreground">
                  TOTP
                </p>
                <Show when={totpStatus()?.enabled}>
                  <p class="text-sm text-muted-foreground">TOTP habilitado</p>
                </Show>
                <Show when={!totpStatus()?.enabled}>
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
                    <img src={totpQrCode()} alt="QR TOTP" class="w-48 h-48" />
                    <Input
                      id="totp-setup-code"
                      type="text"
                      placeholder="Ingresa código TOTP"
                      value={totpCode()}
                      onInput={(
                        e: InputEvent & { currentTarget: HTMLInputElement },
                      ) => setTotpCode(e.currentTarget.value)}
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
                  </Show>
                </Show>
                <Show when={totpMessage()}>
                  <p class="text-sm text-muted-foreground">{totpMessage()}</p>
                </Show>
                <Show when={recoveryCodes().length > 0}>
                  <div class="rounded border p-3 space-y-2">
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
            </div>
          </Card>
        )}
      </Show>
    </div>
  );
}
