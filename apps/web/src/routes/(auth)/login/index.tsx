import { useSearchParams } from "@solidjs/router";
import { onMount, Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { LastUsedPill } from "~/components/auth/flow/last-used-pill";
import { LegalFooter } from "~/components/auth/flow/legal-footer";
import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/input/button";
import { ButtonLink } from "~/components/ui/input/button-link";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";
import { useLoginFlow } from "~/lib/auth/use-login-flow";

import styles from "../../auth/auth-shell.module.css";
import pageStyles from "../../auth/login-page.module.css";
import shellStyles from "~/components/auth/flow/auth-flow-shell.module.css";

export default function LoginPage() {
  useAuthPageView("login");
  const loginMethods = useLoginFlow();
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
            <svg
              class={pageStyles.googleIcon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </Button>
          <Show when={loginMethods.lastUsedMethod() === "google"}>
            <LastUsedPill />
          </Show>
        </div>

        <div class={pageStyles.separator} role="separator" />

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
