import { createAsync, useSearchParams } from "@solidjs/router";
import { createMemo, Show, Suspense } from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { AuthLoadingBlock } from "~/components/auth/flow/auth-loading-block";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { parseLoginFlowId } from "~/lib/auth/login-route-flow";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { usePasskeyLogin } from "~/lib/auth/use-passkey-login";
import { loginFlowQuery } from "~/lib/queries/auth";

import styles from "../../../auth/auth-shell.module.css";
import pageStyles from "../../../auth/login-page.module.css";
import linkStyles from "~/components/auth/flow/auth-links.module.css";

export default function LoginPasskeyPage() {
  useAuthPageView("login_passkey");
  const [searchParams] = useSearchParams();
  const passkeyLogin = usePasskeyLogin();
  const flowId = () => parseLoginFlowId(searchParams.flow);
  const loginFlow = createAsync(() => {
    const currentFlowId = flowId();
    return currentFlowId
      ? loginFlowQuery(currentFlowId)
      : Promise.resolve(null);
  });
  const passkeyFlow = createMemo(() => {
    const flow = loginFlow();
    if (flow === undefined && flowId()) return undefined;
    return flow?.state === "passkey" && flow.mode === "identified"
      ? flow
      : null;
  });

  return (
    <AuthFlowShell
      title="Verificar clave de acceso"
      description="Retoma el acceso con la clave asociada a tu cuenta."
    >
      <Suspense
        fallback={<AuthLoadingBlock label="Cargando clave de acceso" />}
      >
        <Show
          when={passkeyFlow()}
          fallback={
            <div class={pageStyles.formStack}>
              <p class={pageStyles.formError} role="alert">
                La sesión de clave de acceso expiró. Intenta de nuevo.
              </p>
              <a href="/login" class={linkStyles.passkeyLink}>
                Volver al inicio de sesión
              </a>
            </div>
          }
        >
          {(flow) => (
            <EnterTransition>
              <div class={pageStyles.formStack}>
                <p class={pageStyles.supportText}>
                  Usuario: {flow().identifier}
                </p>
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
                <Show when={!passkeyLogin.supportKnown()}>
                  <AuthLoadingBlock label="Comprobando compatibilidad del navegador" />
                </Show>
                <Show
                  when={passkeyLogin.supportKnown() && passkeyLogin.supported()}
                  fallback={
                    <Show when={passkeyLogin.supportKnown()}>
                      <p class={pageStyles.formError} role="alert">
                        Este navegador no admite claves de acceso.
                      </p>
                    </Show>
                  }
                >
                  <Button
                    type="button"
                    class={styles.full}
                    loading={passkeyLogin.busy()}
                    onClick={() => {
                      void passkeyLogin.runFlow(flow());
                    }}
                  >
                    Reintentar con clave de acceso
                  </Button>
                </Show>
              </div>
            </EnterTransition>
          )}
        </Show>
      </Suspense>
      <a href="/login" class={linkStyles.helpLink}>
        Volver al inicio de sesión
      </a>
    </AuthFlowShell>
  );
}
