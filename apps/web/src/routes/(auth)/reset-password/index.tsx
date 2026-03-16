import { useSearchParams, useSubmission } from "@solidjs/router";
import { createMemo, createSignal, Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { LegalFooter } from "~/components/auth/flow/legal-footer";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import {
  requestPasswordResetMutation,
  resetPasswordMutation,
} from "~/lib/mutations/auth";

import styles from "../../auth/auth-shell.module.css";
import pageStyles from "../../auth/login-page.module.css";
import shellStyles from "~/components/auth/flow/auth-flow-shell.module.css";
import linkStyles from "~/components/auth/flow/auth-links.module.css";

export default function ResetPasswordPage() {
  useAuthPageView("reset_password");
  const [searchParams] = useSearchParams();
  const token = () => searchParams.token ?? "";
  const hasToken = () => Boolean(token());

  const requestSubmission = useSubmission(requestPasswordResetMutation);
  const resetSubmission = useSubmission(resetPasswordMutation);

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");

  const requestSent = createMemo(() => requestSubmission.result?.ok === true);

  const requestError = createMemo(() => {
    const result = requestSubmission.result;
    if (!result || result.ok) return undefined;
    switch (result.code) {
      case "email_required":
        return "Ingresa tu correo electrónico.";
      case "rate_limited":
        return "Demasiados intentos. Espera un momento e intenta de nuevo.";
      default:
        return "Ocurrió un error. Intenta de nuevo.";
    }
  });

  const resetError = createMemo(() => {
    const result = resetSubmission.result;
    if (!result || result.ok) return undefined;
    switch (result.code) {
      case "invalid_token":
        return "El enlace no es válido o ya venció. Solicita uno nuevo.";
      case "password_too_short":
        return "La contraseña debe tener al menos 8 caracteres.";
      case "password_mismatch":
        return "Las contraseñas no coinciden.";
      default:
        return "Ocurrió un error. Intenta de nuevo.";
    }
  });

  const resetSucceeded = createMemo(() => resetSubmission.result?.ok === true);

  return (
    <Show
      when={hasToken()}
      fallback={
        <AuthFlowShell
          title="¿Olvidaste tu contraseña?"
          description="Ingresa tu correo y te enviaremos un enlace para restablecerla."
        >
          <Show
            when={!requestSent()}
            fallback={
              <EnterTransition>
                <div class={pageStyles.formStack}>
                  <p class={pageStyles.supportText}>
                    Si existe una cuenta con ese correo, recibirás un enlace en
                    los próximos minutos.
                  </p>
                  <a href="/login" class={linkStyles.passkeyLink}>
                    Volver al inicio de sesión
                  </a>
                </div>
              </EnterTransition>
            }
          >
            <EnterTransition>
              <div class={pageStyles.formStack}>
                <form
                  action={requestPasswordResetMutation}
                  method="post"
                  class={pageStyles.formStack}
                >
                  <Input
                    name="email"
                    type="email"
                    placeholder="Correo electrónico"
                    autocomplete="email"
                    value={email()}
                    onInput={(e) => setEmail(e.currentTarget.value)}
                    required
                  />
                  <Show when={requestError()}>
                    {(msg) => (
                      <p class={pageStyles.formError} role="alert">
                        {msg()}
                      </p>
                    )}
                  </Show>
                  <Button
                    type="submit"
                    class={styles.full}
                    loading={requestSubmission.pending}
                  >
                    Enviar enlace
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
          </Show>
        </AuthFlowShell>
      }
    >
      <AuthFlowShell
        title="Nueva contraseña"
        description="Elige una contraseña segura para tu cuenta."
      >
        <Show
          when={!resetSucceeded()}
          fallback={
            <EnterTransition>
              <div class={pageStyles.formStack}>
                <p class={pageStyles.supportText}>
                  Tu contraseña fue actualizada. Ya puedes iniciar sesión con tu
                  nueva contraseña.
                </p>
                <a href="/login" class={linkStyles.passkeyLink}>
                  Ir al inicio de sesión
                </a>
              </div>
            </EnterTransition>
          }
        >
          <EnterTransition>
            <div class={pageStyles.formStack}>
              <form
                action={resetPasswordMutation}
                method="post"
                class={pageStyles.formStack}
              >
                <input type="hidden" name="token" value={token()} />
                <Input
                  name="password"
                  type="password"
                  placeholder="Nueva contraseña"
                  autocomplete="new-password"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  required
                />
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirmar contraseña"
                  autocomplete="new-password"
                  value={confirmPassword()}
                  onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                  required
                />
                <Show when={resetError()}>
                  {(msg) => (
                    <p class={pageStyles.formError} role="alert">
                      {msg()}
                    </p>
                  )}
                </Show>
                <Button
                  type="submit"
                  class={styles.full}
                  loading={resetSubmission.pending}
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
        </Show>
      </AuthFlowShell>
    </Show>
  );
}
