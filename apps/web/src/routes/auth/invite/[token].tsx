import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { Show, createSignal } from "solid-js";

import { acceptTeamInvite } from "~/actions/team/acceptance";
import { getInviteInfo } from "~/actions/team/invites";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/hooks/use-snack-bar";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

import styles from "../auth-shell.module.css";

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const params = useParams<{ token: string }>();
  const inviteInfo = createAsync(() => getInviteInfo(params.token));
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (password() !== confirmPassword()) {
      enqueueErrorSnackBar({ message: "Las contraseñas no coinciden" });
      return;
    }

    setSubmitting(true);
    try {
      await acceptTeamInvite({
        token: params.token,
        password: password(),
      });
      enqueueSuccessSnackBar({ message: "Cuenta activada" });
      navigate("/onboarding");
    } catch (err: unknown) {
      enqueueErrorSnackBar({
        message: getErrorMessage(err, "No se pudo activar la cuenta"),
      });
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
              Define tu contraseña para activar la cuenta. Los datos del perfil
              y la seguridad se completan en el siguiente paso.
            </p>
          </div>

          <Show when={inviteInfo()}>
            {(info) => (
              <div class={styles.stack4}>
                <Input
                  placeholder="Nombre completo"
                  type="text"
                  value={info().fullName}
                  disabled
                />
                <Input
                  placeholder="Usuario"
                  type="text"
                  value={info().username}
                  disabled
                />
                <Input
                  placeholder="Correo"
                  type="email"
                  value={info().email}
                  disabled
                />
              </div>
            )}
          </Show>

          <Input
            placeholder="Contraseña"
            type="password"
            value={password()}
            onInput={(event) => setPassword(event.currentTarget.value)}
            required
          />
          <Input
            placeholder="Confirmar contraseña"
            type="password"
            value={confirmPassword()}
            onInput={(event) => setConfirmPassword(event.currentTarget.value)}
            required
          />
          <Button
            type="submit"
            class={styles.full}
            loading={submitting()}
            disabled={submitting()}
          >
            Activar cuenta
          </Button>
        </form>
      </section>
    </div>
  );
}
