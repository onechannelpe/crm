import { useAuthPageView } from "~/features/auth/services/use-auth-analytics";
import { AuthFlowShell } from "~/features/auth/ui/auth-flow-shell";
import { LoginCredentialsForm } from "~/features/auth/ui/login-credentials-form";

export default function LoginUserPage() {
  useAuthPageView("login_user");

  return (
    <AuthFlowShell title="Bienvenido.">
      <LoginCredentialsForm />
    </AuthFlowShell>
  );
}
