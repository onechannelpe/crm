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
    <div class="crm-shell min-h-screen px-4 py-12 md:py-20">
      <div class="mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1.1fr_1fr] md:items-center">
        <section class="space-y-8">
          <div class="inline-flex items-center rounded-full border border-border/80 bg-white/70 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            OneChannel CRM
          </div>
          <div class="space-y-4">
            <h1 class="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              Opera tu equipo comercial con una interfaz clara y confiable.
            </h1>
            <p class="max-w-[560px] text-base text-muted-foreground md:text-lg">
              Centraliza leads, validaciones y seguimiento sin ruido visual.
              Diseñado para ejecutar rápido y con foco.
            </p>
          </div>
        </section>

        <section class="crm-surface rounded-3xl p-6 md:p-8">
          <div class="mb-6 flex flex-col items-center space-y-4 text-center">
            <div class="rounded-2xl bg-primary p-3 text-primary-foreground">
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
            <h2 class="text-2xl font-semibold tracking-tight text-foreground">
              Iniciar sesión
            </h2>
          </div>

          <Card class="border-0 bg-transparent shadow-none">
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
                    class="h-12"
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
                    class="h-12"
                  />
                </div>
                <div class="space-y-2">
                  <Input
                    id="totp"
                    type="text"
                    placeholder="Código TOTP o recuperación (si aplica)"
                    value={totpCode()}
                    onInput={(e) => setTotpCode(e.currentTarget.value)}
                    class="h-12"
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
                  class="h-11 w-full text-base"
                  disabled={loading() || passkeyLoading()}
                >
                  {loading() ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  class="h-11 w-full text-base"
                  disabled={
                    loading() || passkeyLoading() || !passkeySupported()
                  }
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
        </section>
      </div>

      <p class="mt-10 px-8 text-center text-xs text-muted-foreground">
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
  );
}
