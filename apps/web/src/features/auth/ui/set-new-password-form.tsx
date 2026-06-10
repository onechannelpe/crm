import { useSubmission } from "@solidjs/router";
import { Show } from "solid-js";

import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { AuthFlowShell } from "~/features/auth/ui/auth-flow-shell";
import { LegalFooter } from "~/features/auth/ui/legal-footer";
import { LoginFeedback } from "~/features/auth/ui/login-feedback";
import { resetPasswordMutation } from "~/lib/mutations/auth";
import { parseWireError } from "~/lib/wire-error";
import { codeIs } from "~/lib/wire-error-codes";

import shellStyles from "~/features/auth/ui/auth-flow-shell.module.css";
import linkStyles from "~/features/auth/ui/auth-links.module.css";
import styles from "~/features/auth/ui/auth-shell.module.css";
import pageStyles from "~/features/auth/ui/login-page.module.css";

export function SetNewPasswordForm(props: { token: string }) {
  const submission = useSubmission(resetPasswordMutation);
  const succeeded = () => submission.result?.ok === true;

  const submitError = () =>
    submission.error ? parseWireError(submission.error) : undefined;

  // An invalid or expired token is terminal: no retry on this form can succeed,
  // so route it to a "request a new link" panel rather than an inline error.
  // The message rides on the wire (catalog copy), so render it verbatim.
  const tokenExpiredMessage = () => {
    const error = submitError();
    return error !== undefined && codeIs(error, "invalid_token")
      ? error.message
      : undefined;
  };

  const fieldError = () => {
    const error = submitError();
    if (error === undefined || codeIs(error, "invalid_token")) return undefined;
    return error.message;
  };

  return (
    <AuthFlowShell
      title="Nueva contraseña"
      description="Elige una contraseña segura para tu cuenta."
    >
      <Show when={!succeeded()} fallback={<PasswordResetDoneNotice />}>
        <Show
          when={tokenExpiredMessage()}
          fallback={
            <EnterTransition>
              <div class={pageStyles.formStack}>
                <form
                  action={resetPasswordMutation}
                  method="post"
                  class={pageStyles.formStack}
                >
                  <input type="hidden" name="token" value={props.token} />
                  <Input
                    name="password"
                    type="password"
                    placeholder="Nueva contraseña"
                    autocomplete="new-password"
                    required
                  />
                  <Input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirmar contraseña"
                    autocomplete="new-password"
                    required
                  />
                  <LoginFeedback message={fieldError()} />
                  <Button
                    type="submit"
                    class={styles.full}
                    loading={submission.pending}
                  >
                    Cambiar contraseña
                  </Button>
                  <a href="/login" class={linkStyles.passkeyLink}>
                    Volver al inicio de sesión
                  </a>
                </form>
                <div class={shellStyles.footerNote}>
                  <LegalFooter />
                </div>
              </div>
            </EnterTransition>
          }
        >
          {(message) => <ExpiredLinkNotice message={message()} />}
        </Show>
      </Show>
    </AuthFlowShell>
  );
}

function PasswordResetDoneNotice() {
  return (
    <EnterTransition>
      <div class={pageStyles.formStack}>
        <p class={pageStyles.supportText}>
          Tu contraseña fue actualizada. Ya puedes iniciar sesión con tu nueva
          contraseña.
        </p>
        <a href="/login" class={linkStyles.passkeyLink}>
          Ir al inicio de sesión
        </a>
      </div>
    </EnterTransition>
  );
}

function ExpiredLinkNotice(props: { message: string }) {
  return (
    <EnterTransition>
      <div class={pageStyles.formStack}>
        <p class={pageStyles.supportText}>{props.message}</p>
        <a href="/reset-password" class={linkStyles.passkeyLink}>
          Solicitar un enlace nuevo
        </a>
      </div>
    </EnterTransition>
  );
}
