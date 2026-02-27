import { useNavigate, useParams } from "@solidjs/router";
import { createSignal } from "solid-js";

import { acceptTeamInvite } from "~/actions/team";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

import styles from "../auth-shell.module.css";

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
      setError("Las contraseñas no coinciden");
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
    <div class={styles.shell}>
      <section class={`${styles.panel} ${styles.panelMd}`}>
        <form
          class={styles.stack4}
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <div>
            <h1 class={styles.title}>Activar cuenta</h1>
            <p class={styles.muted}>
              Completa tus datos para activar el acceso al espacio de trabajo
            </p>
          </div>

          <Input
            label="Nombre completo"
            value={fullName()}
            onInput={(event) => setFullName(event.currentTarget.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password()}
            onInput={(event) => setPassword(event.currentTarget.value)}
            required
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword()}
            onInput={(event) => setConfirmPassword(event.currentTarget.value)}
            required
          />

          {error() ? <div class={styles.errorBox}>{error()}</div> : null}

          <Button type="submit" class={styles.full} disabled={submitting()}>
            {submitting() ? "Activando..." : "Activar cuenta"}
          </Button>
        </form>
      </section>
    </div>
  );
}
