import { useSubmission } from "@solidjs/router";
import { Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { passkeyStartUiMessage } from "~/lib/auth/login-ui";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { passkeyStartMutation } from "~/lib/mutations/auth";

import styles from "../../../auth/auth-shell.module.css";
import pageStyles from "../../../auth/login-page.module.css";

export default function LoginPasskeyStartPage() {
  useAuthPageView("login_passkey_start");
  const passkeyStartSubmission = useSubmission(passkeyStartMutation);

  const passkeyError = () => {
    const result = passkeyStartSubmission.result;
    return result && !result.ok
      ? passkeyStartUiMessage(result.code)
      : undefined;
  };

  return (
    <AuthFlowShell
      title="Usar clave de acceso"
      description="Ingresa tu usuario para continuar con una clave de acceso."
      footerNote={
        <a href="/login" class={pageStyles.helpLink}>
          Volver al inicio de sesión
        </a>
      }
    >
      <form
        class={pageStyles.formStack}
        action={passkeyStartMutation}
        method="post"
      >
        <Show when={passkeyError()}>
          {(message) => (
            <p class={pageStyles.formError} role="alert">
              {message()}
            </p>
          )}
        </Show>
        <EnterTransition>
          <Input
            id="passkey-username"
            type="text"
            label="Usuario"
            class={pageStyles.authControl}
            name="identifier"
            autocomplete="username webauthn"
            autocapitalize="none"
            autocorrect="off"
            spellcheck={false}
            required
          />
        </EnterTransition>

        <Button
          type="submit"
          size="lg"
          class={styles.full}
          loading={passkeyStartSubmission.pending}
        >
          Continuar con clave de acceso
        </Button>
      </form>
    </AuthFlowShell>
  );
}
