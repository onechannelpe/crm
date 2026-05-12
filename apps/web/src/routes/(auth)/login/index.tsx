import { useSearchParams } from "@solidjs/router";
import { onMount, Show } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import Google from "~/components/icons/brands/google";
import { Button } from "~/components/ui/input/button";
import { ButtonLink } from "~/components/ui/input/button-link";
import { useAuthPageView } from "~/features/auth/services/use-auth-analytics";
import { useLoginFlow } from "~/features/auth/services/use-login-flow";
import { usePasskeyLogin } from "~/features/auth/services/use-passkey-login";
import { AuthFlowShell } from "~/features/auth/ui/auth-flow-shell";
import { LastUsedPill } from "~/features/auth/ui/last-used-pill";
import { LegalFooter } from "~/features/auth/ui/legal-footer";

import shellStyles from "~/features/auth/ui/auth-flow-shell.module.css";
import linkStyles from "~/features/auth/ui/auth-links.module.css";
import styles from "~/features/auth/ui/auth-shell.module.css";
import pageStyles from "~/features/auth/ui/login-page.module.css";

export default function LoginPage() {
  useAuthPageView("login");
  const loginMethods = useLoginFlow();
  const passkeyLogin = usePasskeyLogin();
  const [searchParams] = useSearchParams();
  const { enqueueErrorSnackBar } = useSnackBar();

  onMount(() => {
    if (searchParams.error === "google_not_linked") {
      enqueueErrorSnackBar("Tu cuenta no tiene Google vinculado.");
    }
    if (searchParams.error === "strong_auth_required") {
      enqueueErrorSnackBar(
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

        <hr class={pageStyles.separator} />

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
