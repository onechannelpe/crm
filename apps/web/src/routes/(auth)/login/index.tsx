import { useSearchParams } from "@solidjs/router";
import { onMount, Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { LastUsedPill } from "~/components/auth/flow/last-used-pill";
import { LegalFooter } from "~/components/auth/flow/legal-footer";
import { useToast } from "~/components/feedback/toast/provider";
import Google from "~/components/icons/brands/google";
import { Button } from "~/components/ui/input/button";
import { ButtonLink } from "~/components/ui/input/button-link";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { useLoginFlow } from "~/lib/auth/use-login-flow";
import { usePasskeyLogin } from "~/lib/auth/use-passkey-login";

import styles from "../../auth/auth-shell.module.css";
import pageStyles from "../../auth/login-page.module.css";
import shellStyles from "~/components/auth/flow/auth-flow-shell.module.css";
import linkStyles from "~/components/auth/flow/auth-links.module.css";

export default function LoginPage() {
  useAuthPageView("login");
  const loginMethods = useLoginFlow();
  const passkeyLogin = usePasskeyLogin();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  onMount(() => {
    if (searchParams.error === "google_not_linked") {
      showToast("error", "Tu cuenta no tiene Google vinculado.");
    }
    if (searchParams.error === "strong_auth_required") {
      showToast(
        "error",
        "Tu cuenta requiere un factor adicional para completar el acceso.",
      );
    }
  });

  return (
    <AuthFlowShell title="Bienvenido.">
      <div class={pageStyles.formStack}>
        <div class={pageStyles.ssoButtonContainer}>
          <Button
            variant="primary"
            class={styles.full}
            onClick={() => {
              loginMethods.markUsed("google");
              window.location.href = "/api/auth/google";
            }}
          >
            <Google size={16} />
            Continuar con Google
          </Button>
          <Show when={loginMethods.lastUsedMethod() === "google"}>
            <LastUsedPill />
          </Show>
        </div>

        <div class={pageStyles.separator} role="separator" />

        <div class={pageStyles.ssoButtonContainer}>
          <Button
            variant="outline"
            class={styles.full}
            loading={passkeyLogin.busy()}
            onClick={() => {
              loginMethods.markUsed("passkey");
              void passkeyLogin.startDiscoverable();
            }}
          >
            Entrar con llave de acceso
          </Button>
          <Show when={loginMethods.lastUsedMethod() === "passkey"}>
            <LastUsedPill />
          </Show>
          <Show when={passkeyLogin.error()}>
            {(message) => (
              <p class={pageStyles.formError} role="alert">
                {message()}
              </p>
            )}
          </Show>
          <Show
            when={
              passkeyLogin.activeFlow() !== undefined &&
              !passkeyLogin.busy() &&
              passkeyLogin.supported()
            }
          >
            <button
              type="button"
              class={linkStyles.passkeyLink}
              onClick={() => {
                void passkeyLogin.retry();
              }}
            >
              Reintentar con clave de acceso
            </button>
          </Show>
        </div>

        <div class={pageStyles.ssoButtonContainer}>
          <ButtonLink href="/login/user" variant="outline" class={styles.full}>
            Continuar con usuario
          </ButtonLink>
          <Show when={loginMethods.lastUsedMethod() === "password"}>
            <LastUsedPill />
          </Show>
        </div>

        <div class={shellStyles.footerNote}>
          <LegalFooter />
        </div>
      </div>
    </AuthFlowShell>
  );
}
