import { createAsync, useSearchParams, useSubmission } from "@solidjs/router";
import { createMemo, createSignal, onMount, Show, Suspense } from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { AuthLoadingBlock } from "~/components/auth/flow/auth-loading-block";
import { LegalFooter } from "~/components/auth/flow/legal-footer";
import { OtpSlotInput } from "~/components/auth/flow/otp-slot-input";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/hooks/useSnackBar";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { parseLoginFlowId } from "~/lib/auth/login-route-flow";
import { totpLoginUiMessage } from "~/lib/auth/login-ui";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { totpLoginMutation } from "~/lib/mutations/auth";
import { loginFlowQuery } from "~/lib/queries/auth";

import styles from "../../auth/auth-shell.module.css";
import pageStyles from "../../auth/login-page.module.css";
import shellStyles from "~/components/auth/flow/auth-flow-shell.module.css";
import linkStyles from "~/components/auth/flow/auth-links.module.css";

export default function LoginVerifyPage() {
  useAuthPageView("login_verify");
  const [searchParams] = useSearchParams();
  const { enqueueErrorSnackBar } = useSnackBar();
  const totpSubmission = useSubmission(totpLoginMutation);
  const [totpCode, setTotpCode] = createSignal("");
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
      enqueueErrorSnackBar({
        message: "La sesión de inicio expiró. Intenta de nuevo.",
      });
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
    >
      <div class={pageStyles.formStack}>
        <Suspense fallback={<AuthLoadingBlock label="Cargando verificación" />}>
          <Show
            when={totpFlow()}
            fallback={
              <form
                class={pageStyles.formStack}
                aria-label="expired-login-flow"
              >
                <p class={pageStyles.formError} role="alert">
                  La sesión de verificación expiró. Intenta de nuevo.
                </p>
                <a href="/login" class={linkStyles.passkeyLink}>
                  Volver al inicio de sesión
                </a>
              </form>
            }
          >
            {(flow) => (
              <EnterTransition>
                <form
                  class={pageStyles.formStack}
                  action={totpLoginMutation}
                  method="post"
                >
                  <input
                    type="hidden"
                    name="flowId"
                    value={String(flow().id)}
                  />
                  <input type="hidden" name="totpCode" value={totpCode()} />
                  <OtpSlotInput
                    value={totpCode()}
                    onValueChange={setTotpCode}
                  />
                  <Show when={totpError()}>
                    {(msg) => (
                      <p class={pageStyles.formError} role="alert">
                        {msg()}
                      </p>
                    )}
                  </Show>
                  <p class={pageStyles.supportText}>
                    Usuario: {flow().identifier}
                  </p>
                  <div class={pageStyles.actionRow}>
                    <a href="/login" class={linkStyles.passkeyLink}>
                      Usar otra cuenta
                    </a>
                    <Button
                      type="submit"
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
        </Suspense>
        <div class={shellStyles.footerNote}>
          <LegalFooter />
        </div>
      </div>
    </AuthFlowShell>
  );
}
