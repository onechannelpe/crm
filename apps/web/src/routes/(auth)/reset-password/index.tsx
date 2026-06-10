import { useSearchParams } from "@solidjs/router";
import { Show } from "solid-js";

import { useAuthPageView } from "~/features/auth/services/use-auth-analytics";
import { RequestResetForm } from "~/features/auth/ui/request-reset-form";
import { SetNewPasswordForm } from "~/features/auth/ui/set-new-password-form";

export default function ResetPasswordPage() {
  useAuthPageView("reset_password");
  const [searchParams] = useSearchParams();
  const token = () =>
    typeof searchParams.token === "string" ? searchParams.token : "";

  return (
    <Show when={token()} fallback={<RequestResetForm />}>
      {(activeToken) => <SetNewPasswordForm token={activeToken()} />}
    </Show>
  );
}
