import { useSubmission, useSearchParams } from "@solidjs/router";
import {
  createEffect,
  createSignal,
  onMount,
  Show,
} from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { AuthLoadingBlock } from "~/components/auth/flow/auth-loading-block";
import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { passwordLoginUiMessage } from "~/lib/auth/login-ui";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { useLoginFlow } from "~/lib/auth/use-login-flow";
import { usePasskeyLogin } from "~/lib/auth/use-passkey-login";
import { passwordLoginMutation } from "~/lib/mutations/auth";

import styles from "../../auth/auth-shell.module.css";
import pageStyles from "../../auth/login-page.module.css";
import shellStyles from "~/components/auth/flow/auth-flow-shell.module.css";
import linkStyles from "~/components/auth/flow/auth-links.module.css";

export default function LoginUserPage() {
  useAuthPageView("login_user");
  const loginMethods = useLoginFlow();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const passwordSubmission = useSubmission(passwordLoginMutation);
  const passkeyLogin = usePasskeyLogin();
  const [username, setUsername] = createSignal("");
  const [handledPasskeyFlowId, setHandledPasskeyFlowId] = createSignal<
    number | null
  >(null);
  let usernameInputRef: HTMLInputElement | undefined;

  onMount(() => {
    if (searchParams.error === "flow_expired") {
      showToast("error", "La sesión de inicio expiró. Intenta de nuevo.");
    }
    usernameInputRef?.focus();
  });

  const passwordError = () => {
    const result = passwordSubmission.result;
    return result && !result.ok
      ? passwordLoginUiMessage(result.code)
      : undefined;
  };

  createEffect(() => {
    const result = passwordSubmission.result;
    if (!result?.ok || result.nextStep !== "passkey") {
      return;
    }
    if (handledPasskeyFlowId() === result.flow.id) {
      return;
    }

    setHandledPasskeyFlowId(result.flow.id);
    void passkeyLogin.runFlow(result.flow);
  });

  return (
    <AuthFlowShell title="Bienvenido.">
      <div class={pageStyles.formStack}>
        <form
          class={`${pageStyles.formStack} ${pageStyles.credentialForm}`}
          action={passwordLoginMutation}
          method="post"
          onSubmit={() => {
            loginMethods.markUsed("password");
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
            id="auth-username"
            type="text"
            placeholder="Usuario"
            name="identifier"
            autocomplete="username"
            autocapitalize="none"
            autocorrect="off"
            spellcheck={false}
            value={username()}
            onInput={(e) => {
              setUsername(e.currentTarget.value);
              passkeyLogin.clear();
              setHandledPasskeyFlowId(null);
            }}
            ref={(element) => {
              usernameInputRef = element;
            }}
            required
          />
          <Input
            id="current-password"
            type="password"
            placeholder="Contraseña"
            name="password"
            autocomplete="current-password"
            required
          />
          <Button
            type="submit"
            class={styles.full}
            loading={passwordSubmission.pending}
          >
            Iniciar sesión
          </Button>
          <Show when={passkeyLogin.error()}>
            {(message) => (
              <p class={pageStyles.formError} role="alert">
                {message()}
              </p>
            )}
          </Show>
          <Show when={passkeyLogin.busy()}>
            <AuthLoadingBlock label="Esperando tu clave de acceso" />
          </Show>
          <Show
            when={
              passkeyLogin.activeFlow() &&
              !passkeyLogin.busy() &&
              passkeyLogin.supported()
            }
          >
            <button
              type="button"
              class={linkStyles.helpLink}
              onClick={() => {
                void passkeyLogin.retry();
              }}
            >
              Reintentar con clave de acceso
            </button>
          </Show>
          <Show when={passkeyLogin.supported()}>
            <button
              type="button"
              class={linkStyles.passkeyLink}
              onClick={() => {
                void passkeyLogin.start(username());
              }}
            >
              Usar clave de acceso
            </button>
          </Show>
        </form>
        <div class={shellStyles.footerNote}>
          <a href="/reset-password" class={linkStyles.forgotLink}>
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </AuthFlowShell>
  );
}
