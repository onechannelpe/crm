import { useSubmission } from "@solidjs/router";
import { createEffect, createSignal, onMount } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { useLoginFlow } from "~/features/auth/services/use-login-flow";
import { usePasskeyLogin } from "~/features/auth/services/use-passkey-login";
import { passwordLoginMutation } from "~/lib/mutations/auth";
import { actionErrorMessage } from "~/lib/wire-error";

import { LoginFeedback } from "./login-feedback";
import { LoginPasskeyPanel } from "./login-passkey-panel";

import shellStyles from "./auth-flow-shell.module.css";
import linkStyles from "./auth-links.module.css";
import styles from "./login-credentials-form.module.css";

export function LoginCredentialsForm() {
  const loginMethods = useLoginFlow();
  const passwordSubmission = useSubmission(passwordLoginMutation);
  const passkeyLogin = usePasskeyLogin();

  const [username, setUsername] = createSignal("");
  const [handledPasskeyFlowId, setHandledPasskeyFlowId] = createSignal<
    string | null
  >(null);

  let usernameInputRef: HTMLInputElement | undefined;

  onMount(() => {
    usernameInputRef?.focus();
  });

  const passwordError = () =>
    passwordSubmission.error
      ? actionErrorMessage(passwordSubmission.error)
      : undefined;

  createEffect(() => {
    const result = passwordSubmission.result;

    if (!result || handledPasskeyFlowId() === result.flow.id) {
      return;
    }

    setHandledPasskeyFlowId(result.flow.id);
    void passkeyLogin.continueFlow(result.flow);
  });

  function handleUsernameInput(value: string) {
    setUsername(value);
    passkeyLogin.clear();
    setHandledPasskeyFlowId(null);
  }

  return (
    <div class={styles.formStack}>
      <form
        class={`${styles.formStack} ${styles.credentialForm}`}
        action={passwordLoginMutation}
        method="post"
        onSubmit={() => {
          loginMethods.markUsed("password");
        }}
      >
        <LoginFeedback message={passwordError()} />

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
          onInput={(event) => {
            handleUsernameInput(event.currentTarget.value);
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

        <LoginPasskeyPanel
          error={passkeyLogin.errorMessage()}
          busy={passkeyLogin.busy()}
          supported={passkeyLogin.supported()}
          hasActiveFlow={passkeyLogin.activeFlow() !== undefined}
          onRetry={() => {
            void passkeyLogin.retry();
          }}
          onStart={() => {
            loginMethods.markUsed("passkey");
            void passkeyLogin.start(username());
          }}
        />
      </form>

      <div class={shellStyles.footerNote}>
        <a href="/reset-password" class={linkStyles.forgotLink}>
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </div>
  );
}
