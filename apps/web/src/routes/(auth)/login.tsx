import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin } from "~/actions/auth";
import { login } from "~/actions/auth-login";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  isPasskeySupported,
  toAuthenticationPayload,
  toRequestOptions,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [passkeySupported, setPasskeySupported] = createSignal(false);

  onMount(() => {
    setPasskeySupported(isPasskeySupported());
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email(), password(), totpCode());
      navigate(result.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setError("");
    setPasskeyLoading(true);

    try {
      if (!isPasskeySupported()) {
        throw new Error("Este dispositivo no soporta passkeys");
      }

      if (!email().trim()) {
        throw new Error("Ingresa tu correo para usar passkey");
      }

      const challenge = await beginPasskeyLogin(email());
      const credential = await navigator.credentials.get({
        publicKey: toRequestOptions(challenge.options),
      });

      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("No se obtuvo una credencial válida");
      }

      const payload = toAuthenticationPayload(credential);
      const result = await finishPasskeyLogin(challenge.challengeId, payload);
      navigate(result.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "No se pudo iniciar sesión con passkey"));
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div class="min-h-screen grid items-center justify-center bg-gray-50/50 px-4">
      <div class="w-full max-w-100 space-y-8">
        <div class="flex flex-col items-center space-y-4 text-center">
          <div class="bg-black text-white p-3 rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="size-8"
            >
              <title>Logotipo de OneChannel</title>
              <path
                fill-rule="evenodd"
                d="M3 6a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3V6ZM3 15.75a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2.25Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3v-2.25Z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
            Iniciar sesión
          </h1>
        </div>

        <Card class="border-0 shadow-none sm:border sm:shadow-sm bg-transparent sm:bg-white">
          <CardHeader class="pb-0" />
          <CardContent class="space-y-6">
            <form
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
              class="space-y-4"
            >
              <div class="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Correo electrónico"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  required
                  class="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
              <div class="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Contraseña"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  required
                  class="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                />
              </div>
              <div class="space-y-2">
                <Input
                  id="totp"
                  type="text"
                  placeholder="Código TOTP o recuperación (si aplica)"
                  value={totpCode()}
                  onInput={(e) => setTotpCode(e.currentTarget.value)}
                  class="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                />
                <p class="text-xs text-muted-foreground">
                  Usa tu código TOTP o de recuperación si tienes TOTP
                  habilitado.
                </p>
              </div>

              <Show when={error()}>
                <div class="text-sm text-destructive font-medium text-center">
                  {error()}
                </div>
              </Show>

              <Button
                type="submit"
                class="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 shadow-sm"
                disabled={loading() || passkeyLoading()}
              >
                {loading() ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
              <Button
                type="button"
                variant="outline"
                class="w-full h-11 text-base"
                disabled={loading() || passkeyLoading() || !passkeySupported()}
                onClick={() => {
                  void handlePasskeyLogin();
                }}
              >
                {passkeyLoading()
                  ? "Validando passkey..."
                  : "Iniciar con passkey"}
              </Button>
              <Show when={!passkeySupported()}>
                <p class="text-xs text-muted-foreground text-center">
                  Este dispositivo o navegador no soporta passkeys.
                </p>
              </Show>
            </form>

            <div class="text-center">
              <a
                href="mailto:support@onechannel.local"
                class="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </CardContent>
        </Card>

        <p class="text-xs text-center text-gray-400 px-8">
          Este sitio está protegido por Cloudflare Turnstile y se aplican la
          <a
            href="https://www.cloudflare.com/turnstile-privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline mx-1"
          >
            Política de privacidad
          </a>
          y los
          <a
            href="https://www.cloudflare.com/terms/"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline mx-1"
          >
            Términos del servicio
          </a>
          .
        </p>
      </div>
    </div>
  );
}
