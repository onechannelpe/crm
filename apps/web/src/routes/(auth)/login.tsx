import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin } from "~/actions/auth";
import { login } from "~/actions/auth-login";
import { Button } from "~/components/ui/button";
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
  const [passkeySupport, setPasskeySupport] = createSignal<
    "unknown" | "supported" | "unsupported"
  >("unknown");

  onMount(() => {
    setPasskeySupport(isPasskeySupported() ? "supported" : "unsupported");
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
        <section class="space-y-4">
          <div class="inline-flex items-center rounded-full border border-border/80 bg-white/70 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            One Channel
          </div>
          <div class="space-y-4">
            <h1 class="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              Bienvenido de vuelta
            </h1>
            <p class="max-w-[560px] text-base text-muted-foreground md:text-lg">
              Gestiona leads, registra ventas, valida operaciones y consulta
              clientes, cuotas e inventario.
            </p>
            <p class="max-w-[560px] text-sm text-muted-foreground">
              ¿Alguna duda o encontraste un bug? Escribe al{" "}
              <a
                href="mailto:david.duran@onechannel.pe"
                class="font-semibold text-foreground hover:underline"
              >
                soporte interno
              </a>
              .
            </p>
          </div>
        </section>

        <section class="crm-surface rounded-3xl p-6 md:p-8">
          <div class="mb-4 text-center">
            <h2 class="text-2xl font-semibold tracking-tight text-foreground">
              Iniciar sesión
            </h2>
          </div>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            class="space-y-4"
          >
            <Input
              id="email"
              type="email"
              placeholder="Correo corporativo"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              required
              class="h-12"
            />

            <Input
              id="password"
              type="password"
              placeholder="Contraseña"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
              class="h-12"
            />

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
                Usa tu código TOTP o de recuperación si tienes TOTP habilitado.
              </p>
            </div>

            <Show when={error()}>
              <div class="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {error()}
              </div>
            </Show>

            <Button
              type="submit"
              class="h-11 w-full text-base"
              disabled={loading() || passkeyLoading()}
            >
              {loading() ? "Iniciando sesión..." : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              class="h-11 w-full text-base"
              disabled={
                loading() ||
                passkeyLoading() ||
                passkeySupport() !== "supported"
              }
              onClick={() => {
                void handlePasskeyLogin();
              }}
            >
              {passkeyLoading()
                ? "Validando passkey..."
                : "Iniciar con passkey"}
            </Button>
            <div class="min-h-5">
              <Show when={passkeySupport() === "unsupported"}>
                <p class="text-center text-xs text-muted-foreground">
                  Este dispositivo o navegador no soporta passkeys.
                </p>
              </Show>
            </div>
          </form>

          <div class="mt-4 text-center">
            <a
              href="mailto:david.duran@onechannel.pe"
              class="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
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
