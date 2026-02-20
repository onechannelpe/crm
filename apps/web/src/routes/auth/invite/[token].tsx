import { useNavigate, useParams } from "@solidjs/router";
import { createSignal } from "solid-js";

import { acceptTeamInvite } from "~/actions/team";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getErrorMessage } from "~/lib/errors";

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const params = useParams<{ token: string }>();
  const [fullName, setFullName] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (password() !== confirmPassword()) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await acceptTeamInvite({
        token: params.token,
        fullName: fullName(),
        password: password(),
      });
      navigate("/onboarding");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "No se pudo activar la cuenta"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="crm-shell flex min-h-screen items-center justify-center p-4">
      <section class="crm-surface w-full max-w-md rounded-3xl p-6">
        <form
          class="space-y-4"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <div>
            <h1 class="text-2xl font-semibold text-foreground">
              Activar cuenta
            </h1>
            <p class="mt-1 text-sm text-muted-foreground">
              Completa tus datos para activar el acceso al CRM.
            </p>
          </div>

          <Input
            label="Nombre completo"
            value={fullName()}
            onInput={(event) => setFullName(event.currentTarget.value)}
            required
          />
          <Input
            label="Contrasena"
            type="password"
            value={password()}
            onInput={(event) => setPassword(event.currentTarget.value)}
            required
          />
          <Input
            label="Confirmar contrasena"
            type="password"
            value={confirmPassword()}
            onInput={(event) => setConfirmPassword(event.currentTarget.value)}
            required
          />

          {error() ? (
            <div class="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error()}
            </div>
          ) : null}

          <Button type="submit" class="w-full" disabled={submitting()}>
            {submitting() ? "Activando..." : "Activar cuenta"}
          </Button>
        </form>
      </section>
    </div>
  );
}
