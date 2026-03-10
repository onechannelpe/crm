import { createAsync, useSearchParams, useSubmission } from "@solidjs/router";
import { createMemo, onMount, Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { LegalFooter } from "~/components/auth/flow/legal-footer";
import { useToast } from "~/components/feedback/toast-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { parseLoginFlowId } from "~/lib/auth/login-route-flow";
import { totpLoginUiMessage } from "~/lib/auth/login-ui";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { totpLoginMutation } from "~/lib/mutations/auth";
import { loginFlowQuery } from "~/lib/queries/auth";

import styles from "../../auth/auth-shell.module.css";
import pageStyles from "../../auth/login-page.module.css";
import linkStyles from "~/components/auth/flow/auth-links.module.css";

export default function LoginVerifyPage() {
  useAuthPageView("login_verify");
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const totpSubmission = useSubmission(totpLoginMutation);
  const flowId = () => parseLoginFlowId(searchParams.flow);
  const loginFlow = createAsync(() => {
    const currentFlowId = flowId();
    return currentFlowId
      ? loginFlowQuery(currentFlowId)
      : Promise.resolve(null);
  });
  const totpFlow = createMemo(() => {
    const flow = loginFlow();
    if (flow === undefined && flowId()) return undefined;
    return flow?.state === "totp" ? flow : null;
  });

  onMount(() => {
    if (!flowId()) {
      showToast("error", "La sesión de inicio expiró. Intenta de nuevo.");
    }
  });

  const totpError = () => {
    const result = totpSubmission.result;
    return result && !result.ok ? totpLoginUiMessage(result.code) : undefined;
  };

  return (
    <AuthFlowShell
      title="Verificar código"
      description="Ingresa el código de 6 dígitos de tu app de autenticación."
      footerNote={<LegalFooter />}
    >
      <Show
        when={totpFlow() !== undefined}
        fallback={
          <div class={pageStyles.formStack}>
            <p class={pageStyles.supportText} aria-live="polite">
              Cargando verificación…
            </p>
          </div>
        }
      >
        <Show
          when={totpFlow()}
          fallback={
            <div class={pageStyles.formStack}>
              <p class={pageStyles.formError} role="alert">
                La sesión de verificación expiró. Intenta de nuevo.
              </p>
              <a href="/login" class={linkStyles.passkeyLink}>
                Volver al inicio de sesión
              </a>
            </div>
          }
        >
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
                  pattern="[0-9]{6}"
                  maxlength={6}
                  error={totpError()}
                  required
                />
                <p class={pageStyles.supportText}>
                  Usuario: {flow().identifier}
                </p>
                <div class={pageStyles.actionRow}>
                  <a href="/login" class={linkStyles.passkeyLink}>
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
      </Show>
    </AuthFlowShell>
  );
}
