import { createAsync, useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, onMount, Show } from "solid-js";

import { finishPasskeyLogin } from "~/actions/auth";
import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { useToast } from "~/components/feedback/toast-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { parseLoginFlowId } from "~/lib/auth/login-route-flow";
import {
  isPasskeySupported,
  toAuthenticationPayload,
  toRequestOptions,
} from "~/lib/auth/passkey/browser";
import { loginFlowQuery } from "~/lib/queries/auth";

import styles from "../../auth/auth-shell.module.css";
import pageStyles from "../../auth/login-page.module.css";

export default function LoginPasskeyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [pending, setPending] = createSignal(false);
  const [browserSupport, setBrowserSupport] = createSignal<
    "unknown" | "supported" | "unsupported"
  >("unknown");
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
    return flow?.state === "passkey" ? flow : null;
  });

  onMount(() => {
    if (!flowId()) {
      showToast(
        "error",
        "La sesión de clave de acceso expiró. Intenta de nuevo.",
      );
    }
    setBrowserSupport(isPasskeySupported() ? "supported" : "unsupported");
  });

  async function handlePasskeySubmit() {
    const flow = passkeyFlow();
    if (!flow) return;

    setPending(true);

    try {
      const credential = await navigator.credentials.get({
        publicKey: toRequestOptions(flow.requestOptions),
      });
      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("Respuesta de credencial invalida");
      }

      const result = await finishPasskeyLogin(
        flow.id,
        toAuthenticationPayload(credential),
      );
      if (!result.ok) {
        showToast("error", result.message);
        navigate(
          result.code === "flow_expired"
            ? "/login?error=flow_expired"
            : "/login",
        );
        return;
      }

      navigate(result.redirectTo);
    } catch {
      showToast("error", "No se pudo iniciar sesión con la clave de acceso");
      navigate("/login");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFlowShell
      title="Verificar clave de acceso"
      description="Continúa con la clave de acceso asociada a tu cuenta."
      footerNote={
        <a href="/login" class={pageStyles.helpLink}>
          Volver al inicio de sesión
        </a>
      }
    >
      <Show
        when={passkeyFlow() !== undefined}
        fallback={
          <div class={pageStyles.formStack}>
            <p class={pageStyles.supportText} aria-live="polite">
              Cargando clave de acceso…
            </p>
          </div>
        }
      >
        <Show
          when={passkeyFlow()}
          fallback={
            <div class={pageStyles.formStack}>
              <p class={pageStyles.formError} role="alert">
                La sesión de clave de acceso expiró. Intenta de nuevo.
              </p>
              <a href="/login" class={pageStyles.passkeyLink}>
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
                <Show
                  when={browserSupport() !== "unknown"}
                  fallback={
                    <p class={pageStyles.supportText} aria-live="polite">
                      Comprobando compatibilidad del navegador…
                    </p>
                  }
                >
                  <Show
                    when={browserSupport() === "supported"}
                    fallback={
                      <p class={pageStyles.formError} role="alert">
                        Este navegador no admite claves de acceso.
                      </p>
                    }
                  >
                    <Button
                      type="button"
                      size="lg"
                      class={styles.full}
                      loading={pending()}
                      onClick={() => {
                        void handlePasskeySubmit();
                      }}
                    >
                      Continuar con clave de acceso
                    </Button>
                  </Show>
                </Show>
              </div>
            </EnterTransition>
          )}
        </Show>
      </Show>
    </AuthFlowShell>
  );
}
