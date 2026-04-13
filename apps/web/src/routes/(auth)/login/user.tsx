import { useSearchParams } from "@solidjs/router";
import { onMount } from "solid-js";

import { AuthFlowShell } from "~/components/auth/flow/auth-flow-shell";
import { LoginCredentialsForm } from "~/components/auth/flow/login-credentials-form";
import { useToast } from "~/components/feedback/toast/provider";
import { useAuthPageView } from "~/lib/auth/use-auth-analytics";

export default function LoginUserPage() {
  useAuthPageView("login_user");
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  onMount(() => {
    if (searchParams.error === "flow_expired") {
      showToast("error", "La sesión de inicio expiró. Intenta de nuevo.");
    }
  });

  return (
    <AuthFlowShell title="Bienvenido.">
      <LoginCredentialsForm />
    </AuthFlowShell>
  );
}
