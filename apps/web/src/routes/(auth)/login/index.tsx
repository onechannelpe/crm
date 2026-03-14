import { useSearchParams, useSubmission } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  onMount,
  Show,
} from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { LastUsedPill } from "~/components/auth/flow/last-used-pill";
import { LegalFooter } from "~/components/auth/flow/legal-footer";
import { useToast } from "~/components/feedback/toast-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  passkeyStartUiMessage,
  passwordLoginUiMessage,
} from "~/lib/auth/login-ui";
import { isPasskeyAuthenticationSupported } from "~/lib/auth/passkey/authentication-client";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { useLoginFlow } from "~/lib/auth/use-login-flow";
import {
  passkeyStartMutation,
  passwordLoginMutation,
} from "~/lib/mutations/auth";

import styles from "../../auth/auth-shell.module.css";
import pageStyles from "../../auth/login-page.module.css";
import linkStyles from "~/components/auth/flow/auth-links.module.css";

type LoginStep = "init" | "email" | "passkey" | "password";

export default function LoginPage() {
  useAuthPageView("login");
  const loginMethods = useLoginFlow();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const passwordSubmission = useSubmission(passwordLoginMutation);
  const passkeyStartSubmission = useSubmission(passkeyStartMutation);
  const [step, setStep] = createSignal<LoginStep>("init");
  const [username, setUsername] = createSignal("");
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  let usernameInputRef: HTMLInputElement | undefined;
  const setUsernameInputRef = (element: HTMLInputElement) => {
    usernameInputRef = element;
  };
  let passwordInputRef: HTMLInputElement | undefined;
  const setPasswordInputRef = (element: HTMLInputElement) => {
    passwordInputRef = element;
  };

  onMount(() => {
    if (searchParams.error === "google_not_linked") {
      showToast("error", "Tu cuenta no tiene Google vinculado.");
    }
    if (searchParams.error === "flow_expired") {
      showToast("error", "La sesión de inicio expiró. Intenta de nuevo.");
    }
    setPasskeySupported(isPasskeyAuthenticationSupported());
  });

  createEffect(() => {
    if (step() !== "email") return;
    usernameInputRef?.focus();
  });

  createEffect(() => {
    if (step() !== "password") return;
    passwordInputRef?.focus();
  });

  const footerNote = createMemo(() => {
    if (step() === "passkey" || step() === "password") {
      return (
        <a href="/reset-password" class={linkStyles.forgotLink}>
          ¿Olvidaste tu contraseña?
        </a>
      );
    }
    return <LegalFooter />;
  });

  const passwordError = () => {
    const result = passwordSubmission.result;
    return result && !result.ok
      ? passwordLoginUiMessage(result.code)
      : undefined;
  };

  return (
    <AuthFlowShell title="Bienvenido." footerNote={footerNote()}>
      <div class={pageStyles.formStack}>
        <div class={pageStyles.ssoButtonContainer}>
          <Button
            variant={step() === "init" ? "primary" : "outline"}
            class={styles.full}
            onClick={() => {
              loginMethods.markUsed("google");
              window.location.href = "/api/auth/google";
            }}
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
          <Show when={loginMethods.lastUsedMethod() === "google"}>
            <LastUsedPill />
          </Show>
        </div>

        <div class={pageStyles.separator} role="separator" />

        <Show when={step() === "init"}>
          <div class={pageStyles.ssoButtonContainer}>
            <Button
              variant="outline"
              class={styles.full}
              onClick={() => setStep("email")}
            >
              Continuar con usuario
            </Button>
            <Show when={loginMethods.lastUsedMethod() === "password"}>
              <LastUsedPill />
            </Show>
          </div>
        </Show>

        <Show when={step() === "email"}>
          <EnterTransition>
            <form
              class={pageStyles.formStack}
              onSubmit={(event) => {
                event.preventDefault();
                if (!username().trim()) return;
                setStep("password");
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setStep("init");
              }}
            >
              <Input
                id="auth-username"
                type="text"
                placeholder="Usuario"
                autocomplete="username"
                autocapitalize="none"
                autocorrect="off"
                spellcheck={false}
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                ref={setUsernameInputRef}
                required
              />
              <Button type="submit" class={styles.full}>
                Continuar
              </Button>
              <Show when={passkeySupported()}>
                <button
                  type="button"
                  class={linkStyles.passkeyLink}
                  onClick={() => setStep("passkey")}
                >
                  Iniciar con clave de acceso
                </button>
              </Show>
            </form>
          </EnterTransition>
        </Show>

        <Show when={step() === "passkey"}>
          <EnterTransition>
            <form
              class={pageStyles.formStack}
              action={passkeyStartMutation}
              method="post"
              onKeyDown={(event) => {
                if (event.key === "Escape") setStep("email");
              }}
            >
              <Show
                when={
                  passkeyStartSubmission.result &&
                  !passkeyStartSubmission.result.ok
                }
              >
                {(_) => (
                  <p class={pageStyles.formError} role="alert">
                    {passkeyStartUiMessage(passkeyStartSubmission.result!.code)}
                  </p>
                )}
              </Show>
              <input type="hidden" name="identifier" value={username()} />
              <Button
                type="submit"
                class={styles.full}
                loading={passkeyStartSubmission.pending}
              >
                Continuar con clave de acceso
              </Button>
              <button
                type="button"
                class={linkStyles.helpLink}
                onClick={() => setStep("email")}
              >
                Volver
              </button>
            </form>
          </EnterTransition>
        </Show>

        <Show when={step() === "password"}>
          <form
            class={pageStyles.formStack}
            action={passwordLoginMutation}
            method="post"
            onSubmit={() => {
              loginMethods.markUsed("password");
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setStep("email");
            }}
          >
            <Show when={passwordError()}>
              {(message) => (
                <p class={pageStyles.formError} role="alert">
                  {message()}
                </p>
              )}
            </Show>
            <Input
              id="auth-identifier"
              type="text"
              placeholder="Usuario"
              name="identifier"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              spellcheck={false}
              value={username()}
              onInput={(e) => {
                const next = e.currentTarget.value;
                if (next !== username()) setStep("email");
                setUsername(next);
              }}
              required
            />
            <EnterTransition>
              <Input
                id="current-password"
                type="password"
                placeholder="Contraseña"
                name="password"
                autocomplete="current-password"
                ref={setPasswordInputRef}
                required
              />
            </EnterTransition>
            <Button
              type="submit"
              class={styles.full}
              loading={passwordSubmission.pending}
            >
              Iniciar sesión
            </Button>
          </form>
        </Show>
      </div>
    </AuthFlowShell>
  );
}
