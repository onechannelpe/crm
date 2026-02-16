import { createResource, createSignal, onMount, Show } from "solid-js";

import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
} from "~/actions/auth";
import { getMe } from "~/actions/auth-session";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
            </div>
          </Card>
        )}
      </Show>
    </div>
  );
}
