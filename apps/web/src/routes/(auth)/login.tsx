import { createAsync, useSearchParams, useSubmission } from "@solidjs/router";
import { createMemo, onMount, Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { LastUsedPill } from "~/components/auth/last-used-pill";
import { useToast } from "~/components/feedback/toast-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { useLoginFlow } from "~/lib/auth/use-login-flow";
import { passwordLoginMutation, totpLoginMutation } from "~/lib/mutations/auth";
import { loginFlowQuery } from "~/lib/queries/auth";

import styles from "../auth/auth-shell.module.css";
import pageStyles from "../auth/login-page.module.css";

function parseFlowId(raw: string | string[] | undefined): number | null {
  if (!raw || Array.isArray(raw)) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function LoginPage() {
  const loginMethods = useLoginFlow();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const passwordSubmission = useSubmission(passwordLoginMutation);
  const totpSubmission = useSubmission(totpLoginMutation);
  const flowId = () => parseFlowId(searchParams.flow);
  const loginFlow = createAsync(() => {
    const currentFlowId = flowId();
    return currentFlowId
      ? loginFlowQuery(currentFlowId)
      : Promise.resolve(null);
  });
  const totpFlow = createMemo(() => {
    const flow = loginFlow();
    return flow?.state === "totp" ? flow : null;
  });

  onMount(() => {
    if (searchParams.error === "google_not_linked") {
      showToast("error", "Tu cuenta no tiene Google vinculado.");
    }
    if (searchParams.error === "flow_expired") {
      showToast("error", "La sesión de inicio expiró. Intenta de nuevo.");
    }
  });

  const title = () => {
    if (loginFlow()?.state === "totp") return "Verificar código";
    return "Bienvenido.";
  };

  const footerNote = createMemo(() => {
    if (!totpFlow()) {
      return (
        <a href="/reset-password" class={pageStyles.forgotLink}>
          ¿Olvidaste tu contraseña?
        </a>
      );
    }

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
  });

  const passwordError = () => {
    const result = passwordSubmission.result;
    return result && !result.ok ? result.message : undefined;
  };

  const totpError = () => {
    const result = totpSubmission.result;
    return result && !result.ok ? result.message : undefined;
  };

  return (
    <AuthFlowShell
      title={title()}
      description={
        loginFlow()?.state === "totp"
          ? "Ingresa el código de 6 dígitos de tu app de autenticación."
          : undefined
      }
      footerNote={footerNote()}
    >
      <div class={pageStyles.formStack}>
        <Show when={loginFlow()?.state !== "totp"}>
          <div class={pageStyles.ssoButtonContainer}>
            <Button
              variant={!loginFlow() ? "primary" : "outline"}
              class={styles.full}
              onClick={loginMethods.handleGoogleLogin}
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
        </Show>

        <Show when={!totpFlow()}>
          <>
            <div class={pageStyles.separator} role="separator" />
            <form
              class={pageStyles.formStack}
              action={passwordLoginMutation}
              method="post"
              onSubmit={() => {
                loginMethods.markPasswordUsed();
              }}
            >
              <Show when={passwordError()}>
                {(message) => (
                  <p class={pageStyles.formError} role="alert">
                    {message()}
                  </p>
                )}
              </Show>
              <EnterTransition>
                <Input
                  id="username"
                  type="text"
                  label="Usuario"
                  class={pageStyles.authControl}
                  name="identifier"
                  autocomplete="username"
                  autocapitalize="none"
                  autocorrect="off"
                  spellcheck={false}
                  required
                />
              </EnterTransition>

              <EnterTransition>
                <Input
                  id="current-password"
                  type="password"
                  label="Contraseña"
                  class={pageStyles.authControl}
                  name="password"
                  autocomplete="current-password"
                  required
                />
              </EnterTransition>

              <Button
                type="submit"
                size="lg"
                class={styles.full}
                loading={passwordSubmission.pending}
              >
                Iniciar sesión
              </Button>

              <Show when={loginMethods.passkeySupport() === "supported"}>
                <button
                  type="button"
                  class={pageStyles.passkeyLink}
                  disabled={loginMethods.passkeyLoading()}
                  onClick={(event) => {
                    const form = event.currentTarget.form;
                    if (!form) return;
                    void loginMethods.triggerPasskeyLogin(form);
                  }}
                >
                  {loginMethods.passkeyLoading()
                    ? "Iniciando clave de acceso..."
                    : "Iniciar con clave de acceso"}
                </button>
              </Show>

              <Show when={loginMethods.lastUsedMethod() === "password"}>
                <div class={pageStyles.ssoButtonContainer}>
                  <LastUsedPill />
                </div>
              </Show>
            </form>
          </>
        </Show>

        <Show when={totpFlow()}>
          {(flow) => (
            <EnterTransition>
              <form
                class={pageStyles.formStack}
                action={totpLoginMutation}
                method="post"
              >
                <input type="hidden" name="flowId" value={String(flow().id)} />
                <Input
                  id="totpCode"
                  type="text"
                  label="Codigo de verificacion"
                  class={pageStyles.authControl}
                  name="totpCode"
                  autocomplete="one-time-code"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength={6}
                  error={totpError()}
                  required
                />
                <p class={pageStyles.supportText}>
                  Usuario: {flow().identifier}
                </p>
                <div class={pageStyles.actionRow}>
                  <a href="/login" class={pageStyles.passkeyLink}>
                    Usar otra cuenta
                  </a>
                  <Button
                    type="submit"
                    size="lg"
                    class={styles.full}
                    loading={totpSubmission.pending}
                  >
                    Iniciar sesión
                  </Button>
                </div>
              </form>
            </EnterTransition>
          )}
        </Show>
      </div>
    </AuthFlowShell>
  );
}
