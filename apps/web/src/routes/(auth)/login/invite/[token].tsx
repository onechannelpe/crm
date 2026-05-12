import { useParams } from "@solidjs/router";

import { useAuthPageView } from "~/features/auth/services/use-auth-analytics";
import { AuthFlowShell } from "~/features/auth/ui/auth-flow-shell";
import { InviteActivationView } from "~/features/auth/ui/invite-activation-view";

export default function LoginInvitePage() {
  useAuthPageView("login");
  const params = useParams<{ token: string }>();

  return (
    <AuthFlowShell
      title="Activar cuenta"
      description="Define tu contraseña para activar la cuenta. El perfil ya fue provisionado por RR.HH."
    >
      <InviteActivationView token={params.token} />
    </AuthFlowShell>
  );
}
