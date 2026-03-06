import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { Show, createSignal } from "solid-js";

import { acceptTeamInvite, getInviteInfo } from "~/actions/team";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

import styles from "../auth-shell.module.css";

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const params = useParams<{ token: string }>();
  const inviteInfo = createAsync(() => getInviteInfo(params.token));
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

          <Show when={inviteInfo()}>
            {(info) => (
              <div class={styles.stack4}>
                <Input
                  label="Nombre completo"
                  type="text"
                  value={info().fullName}
                  disabled
                />
                <Input
                  label="Usuario"
                  type="text"
                  value={info().username}
                  disabled
                />
                <Input
                  label="Correo"
                  type="email"
                  value={info().email}
                  disabled
                />
              </div>
            )}
          </Show>

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
