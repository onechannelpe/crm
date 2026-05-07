import { useSearchParams } from "@solidjs/router";
import { onMount } from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { LoginCredentialsForm } from "~/components/auth/flow/login-credentials-form";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/hooks/useSnackBar";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";

export default function LoginUserPage() {
  useAuthPageView("login_user");
  const [searchParams] = useSearchParams();
  const { enqueueErrorSnackBar } = useSnackBar();

  onMount(() => {
    if (searchParams.error === "flow_expired") {
      enqueueErrorSnackBar({
        message: "La sesión de inicio expiró. Intenta de nuevo.",
      });
    }
  });

  return (
    <AuthFlowShell title="Bienvenido.">
      <LoginCredentialsForm />
    </AuthFlowShell>
  );
}
