import { createSignal, onMount, Show } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  finishPasskeyRegistration,
  finishTotpEnrollment,
  getTotpStatus,
} from "~/actions/auth";
import {
  AppInsetPanel,
  AppPage,
  AppPageHeader,
  AppPageSection,
} from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
import { createAppQuery } from "~/lib/ui/create-app-query";
import { runOptimistic } from "~/lib/ui/run-optimistic";

export default function ProfilePage() {
  const { currentUser } = useSession();
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [passkeyMessage, setPasskeyMessage] = createSignal("");
  const [totpStatus, { mutate: mutateTotpStatus, refetch: refetchTotp }] =
    createAppQuery(getTotpStatus, { enabled: false });
  const currentTotpStatus = () => totpStatus();
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [totpMessage, setTotpMessage] = createSignal("");
  const [totpQrCode, setTotpQrCode] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const user = () => currentUser();

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
      let codes: string[] = [];
      await runOptimistic({
        read: currentTotpStatus,
        write: (next) => mutateTotpStatus(() => next),
        optimistic: (prev) => ({ ...prev, enabled: true }),
        commit: async () => {
          codes = await finishTotpEnrollment(totpCode());
        },
        reconcile: () => {
          void refetchTotp();
        },
      });
      setRecoveryCodes(codes);
      setTotpQrCode("");
      setTotpCode("");
      setTotpMessage("TOTP activado. Guarda los códigos de recuperación.");
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Código TOTP inválido"));
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Datos de tu sesión y controles de seguridad."
      />

      <AppPageSection class="space-y-4 p-6">
        <div>
          <p class="text-xs uppercase tracking-wider text-muted-foreground">
            Nombre
          </p>
          <p class="text-base font-medium text-foreground">{user().fullName}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wider text-muted-foreground">
            Correo
          </p>
          <p class="text-base text-foreground">{user().email}</p>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-wider text-muted-foreground">
            Rol actual
          </p>
          <Badge variant={getRoleBadgeVariant(user().role)}>
            {getRoleLabel(user().role)}
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
            {passkeyLoading() ? "Registrando passkey..." : "Registrar passkey"}
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
              <AppInsetPanel class="space-y-2">
                <p class="text-sm font-medium">
                  Códigos de recuperación (solo una vez)
                </p>
                <ul class="grid grid-cols-2 gap-2 text-sm">
                  {recoveryCodes().map((code) => (
                    <li class="font-mono">{code}</li>
                  ))}
                </ul>
              </AppInsetPanel>
            </Show>
          </div>
        </div>
      </AppPageSection>
    </AppPage>
  );
}
