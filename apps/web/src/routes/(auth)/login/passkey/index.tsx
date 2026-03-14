import {
  createAsync,
  useAction,
  useNavigate,
  useSearchParams,
} from "@solidjs/router";
import { createMemo, createSignal, onMount, Show } from "solid-js";

import { finishPasskeyLogin } from "~/actions/auth";
import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { useToast } from "~/components/feedback/toast-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { parseLoginFlowId } from "~/lib/auth/login-route-flow";
import { passkeyFinishUiMessage } from "~/lib/auth/login-ui";
import {
  createAuthenticationResponse,
  isPasskeyAuthenticationSupported,
} from "~/lib/auth/passkey/client";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { trackAuthClientEventMutation } from "~/lib/mutations/auth-analytics";
import { loginFlowQuery } from "~/lib/queries/auth";

import styles from "../../../auth/auth-shell.module.css";
import pageStyles from "../../../auth/login-page.module.css";
import linkStyles from "~/components/auth/flow/auth-links.module.css";

export default function LoginPasskeyPage() {
  useAuthPageView("login_passkey");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const trackAuthClientEvent = useAction(trackAuthClientEventMutation);
  const { showToast } = useToast();
  const [pending, setPending] = createSignal(false);
  const [passkeyError, setPasskeyError] = createSignal<string>();
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
    if (isPasskeyAuthenticationSupported()) {
      setBrowserSupport("supported");
      return;
    }

    setBrowserSupport("unsupported");
    void trackAuthClientEvent({
      kind: "passkey_result",
      outcome: "failed",
      code: "unsupported",
    });
  });

  async function handlePasskeySubmit() {
    const flow = passkeyFlow();
    if (!flow) return;

    setPasskeyError(undefined);
    setPending(true);

    try {
      const result = await finishPasskeyLogin(
        flow.id,
        await createAuthenticationResponse(flow.requestOptions),
      );
      if (!result.ok) {
        if (result.code === "flow_expired") {
          navigate("/login?error=flow_expired");
          return;
        }

        setPasskeyError(passkeyFinishUiMessage(result.code));
        return;
      }

      navigate(result.redirectTo);
    } catch (error: unknown) {
      setPasskeyError(getPasskeyErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  function getPasskeyErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError" || error.name === "AbortError") {
        void trackAuthClientEvent({
          kind: "passkey_result",
          outcome: "failed",
          code: "cancelled",
        });
        return "La verificación con clave de acceso se canceló. Intenta de nuevo.";
      }
    }

    void trackAuthClientEvent({
      kind: "passkey_result",
      outcome: "failed",
      code: "browser_error",
    });
    return "No se pudo iniciar sesión con la clave de acceso.";
  }

  return (
    <AuthFlowShell
      title="Verificar clave de acceso"
      description="Continúa con la clave de acceso asociada a tu cuenta."
      footerNote={
        <a href="/login" class={linkStyles.helpLink}>
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
                <Show when={passkeyError()}>
                  {(message) => (
                    <p class={pageStyles.formError} role="alert">
                      {message()}
                    </p>
                  )}
                </Show>
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
