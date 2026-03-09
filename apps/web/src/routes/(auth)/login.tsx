import { useSearchParams } from "@solidjs/router";
import { createMemo, onMount, Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { LastUsedPill } from "~/components/auth/last-used-pill";
import { OtpSlotInput } from "~/components/auth/otp-slot-input";
import { useToast } from "~/components/feedback/toast-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { useLoginFlow } from "~/lib/auth/use-login-flow";

import styles from "../auth/auth-shell.module.css";
import pageStyles from "../auth/login-page.module.css";

export default function LoginPage() {
  const flow = useLoginFlow();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  onMount(() => {
    if (searchParams.error === "google_not_linked") {
      showToast("error", "Tu cuenta no tiene Google vinculado.");
    }
  });

  const title = () => {
    if (flow.step() === "totp") return "Verificar código";
    if (flow.step() === "passkey") return "Clave de acceso";
    return "Bienvenido.";
  };

  const footerNote = createMemo(() => {
    if (flow.step() === "password") {
      return (
        <a href="/reset-password" class={pageStyles.forgotLink}>
          ¿Olvidaste tu contraseña?
        </a>
      );
    }
    if (flow.step() === "init" || flow.step() === "email") {
      return (
        <span>
          <a href="/privacy" class={pageStyles.helpLink}>
            Privacidad
          </a>
          {" · "}
          <a href="/terms" class={pageStyles.helpLink}>
            Términos
          </a>
        </span>
      );
    }
    return undefined;
  });

  return (
    <AuthFlowShell
      title={title()}
      description={
        flow.step() === "totp"
          ? "Ingresa el código de 6 dígitos de tu app de autenticación."
          : undefined
      }
      footerNote={footerNote()}
    >
      <div class={pageStyles.formStack}>
        <Show
          when={
            flow.step() === "init" ||
            flow.step() === "email" ||
            flow.step() === "password"
          }
        >
          <div class={pageStyles.ssoButtonContainer}>
            <Button
              variant={flow.step() === "init" ? "primary" : "outline"}
              class={styles.full}
              onClick={flow.handleGoogleLogin}
            >
              <svg
                class={pageStyles.googleIcon}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar con Google
            </Button>
            <Show when={flow.lastUsedMethod() === "google"}>
              <LastUsedPill />
            </Show>
          </div>

          <div class={pageStyles.separator} role="separator" />
        </Show>

        <Show when={flow.step() === "init"}>
          <div class={pageStyles.ssoButtonContainer}>
            <Button
              variant="outline"
              class={styles.full}
              onClick={() => flow.setStep("email")}
            >
              Continuar con usuario
            </Button>
            <Show when={flow.lastUsedMethod() === "password"}>
              <LastUsedPill />
            </Show>
          </div>
        </Show>

        <Show when={flow.step() === "email" || flow.step() === "password"}>
          <form
            class={pageStyles.formStack}
            onSubmit={(e) => {
              e.preventDefault();
              if (flow.step() === "email") {
                if (!flow.requireUsername()) return;
                flow.setStep("password");
                return;
              }
              void flow.handlePasswordSubmit();
            }}
          >
            <EnterTransition>
              <Input
                id="auth-username"
                type="text"
                name="username"
                placeholder="Usuario"
                autocomplete="username"
                value={flow.username()}
                onInput={(e) => {
                  const next = e.currentTarget.value;
                  if (next !== flow.username() && flow.step() === "password") {
                    flow.setStep("email");
                  }
                  flow.setUsername(next);
                }}
                required
              />
            </EnterTransition>

            <Show when={flow.step() === "password"}>
              <EnterTransition>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Contraseña"
                  autocomplete="current-password"
                  value={flow.password()}
                  onInput={(e) => flow.setPassword(e.currentTarget.value)}
                  required
                />
              </EnterTransition>
            </Show>

            <Button
              type="submit"
              class={styles.full}
              loading={flow.step() === "password" && flow.loading()}
            >
              {flow.step() === "password" ? "Iniciar sesión" : "Continuar"}
            </Button>

            <Show
              when={
                flow.step() === "email" && flow.passkeySupport() === "supported"
              }
            >
              <button
                type="button"
                class={pageStyles.passkeyLink}
                onClick={() => {
                  if (!flow.requireUsername()) return;
                  flow.setStep("passkey");
                }}
              >
                Iniciar con clave de acceso
              </button>
            </Show>
          </form>
        </Show>

        {/* TOTP */}
        <Show when={flow.step() === "totp"}>
          <EnterTransition>
            <form
              class={pageStyles.formStack}
              onSubmit={(e) => {
                e.preventDefault();
                void flow.handleTotpSubmit();
              }}
            >
              <OtpSlotInput
                value={flow.totpCode()}
                onValueChange={flow.setTotpCode}
              />
              <div class={pageStyles.actionRow}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => flow.setStep("password")}
                >
                  Atrás
                </Button>
                <Button
                  type="submit"
                  class={styles.full}
                  loading={flow.loading()}
                >
                  Iniciar sesión
                </Button>
              </div>
            </form>
          </EnterTransition>
        </Show>

        {/* Passkey */}
        <Show when={flow.step() === "passkey"}>
          <EnterTransition>
            <div class={pageStyles.formStack}>
              <p class={pageStyles.supportText}>
                {flow.passkeyLoading()
                  ? "Esperando tu dispositivo..."
                  : flow.passkeySupport() === "unsupported"
                    ? "Este dispositivo no es compatible con claves de acceso."
                    : "Usa una clave de acceso registrada."}
              </p>
              <div class={pageStyles.actionRow}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => flow.setStep("email")}
                >
                  Atrás
                </Button>
                <Show
                  when={
                    flow.passkeySupport() === "supported" &&
                    !flow.passkeyLoading()
                  }
                >
                  <Button
                    type="button"
                    variant="outline"
                    class={styles.full}
                    onClick={() => {
                      void flow.triggerPasskeyLogin();
                    }}
                  >
                    Reintentar
                  </Button>
                </Show>
              </div>
            </div>
          </EnterTransition>
        </Show>
      </div>
    </AuthFlowShell>
  );
}
