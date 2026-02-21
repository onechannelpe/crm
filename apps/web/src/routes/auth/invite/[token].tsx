import { useNavigate, useParams } from "@solidjs/router";
import { createSignal } from "solid-js";

import { acceptTeamInvite } from "~/actions/team";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

import styles from "../../auth-shell.module.css";

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
      setError("Passwords do not match");
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
      setError(getErrorMessage(err, "Failed to activate account"));
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
            <h1 class={styles.title}>Activate account</h1>
            <p class={styles.muted}>
              Complete your details to activate workspace access.
            </p>
          </div>

          <Input
            label="Full name"
            value={fullName()}
            onInput={(event) => setFullName(event.currentTarget.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password()}
            onInput={(event) => setPassword(event.currentTarget.value)}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword()}
            onInput={(event) => setConfirmPassword(event.currentTarget.value)}
            required
          />

          {error() ? <div class={styles.errorBox}>{error()}</div> : null}

          <Button type="submit" class={styles.full} disabled={submitting()}>
            {submitting() ? "Activating..." : "Activate account"}
          </Button>
        </form>
      </section>
    </div>
  );
}
