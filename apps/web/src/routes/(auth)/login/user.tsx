import { useSearchParams } from "@solidjs/router";
import { onMount } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { useAuthPageView } from "~/features/auth/services/use-auth-analytics";
import { AuthFlowShell } from "~/features/auth/ui/auth-flow-shell";
import { LoginCredentialsForm } from "~/features/auth/ui/login-credentials-form";

export default function LoginUserPage() {
  useAuthPageView("login_user");
  const [searchParams] = useSearchParams();
  const { enqueueErrorSnackBar } = useSnackBar();

  onMount(() => {
    if (searchParams.error === "flow_expired") {
      enqueueErrorSnackBar("La sesión de inicio expiró. Intenta de nuevo.");
    }
  });

  return (
    <AuthFlowShell title="Bienvenido.">
      <LoginCredentialsForm />
    </AuthFlowShell>
  );
}
