import { Show } from "solid-js";

import Google from "~/components/icons/brands/google";
import { Button } from "~/components/ui/input/button";
import { ButtonLink } from "~/components/ui/input/button-link";
import { useLoginFlow } from "~/features/auth/services/use-login-flow";
import { usePasskeyLogin } from "~/features/auth/services/use-passkey-login";

import shellStyles from "./auth-flow-shell.module.css";
import linkStyles from "./auth-links.module.css";
import styles from "./auth-shell.module.css";
import { LastUsedPill } from "./last-used-pill";
import { LegalFooter } from "./legal-footer";
import pageStyles from "./login-page.module.css";

export function LoginHome() {
  const loginMethods = useLoginFlow();
  const passkeyLogin = usePasskeyLogin();

  return (
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
  );
}
