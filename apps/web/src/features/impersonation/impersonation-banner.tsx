import { useAction } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { Button } from "~/components/ui/input/button";
import { stopImpersonationMutation } from "~/lib/mutations/members";
import { shortName } from "~/lib/users/display-name";

import styles from "./impersonation-banner.module.css";

export function ImpersonationBanner() {
  const { currentUser } = useAuthenticatedSession();
  const stop = useAction(stopImpersonationMutation);
  const [busy, setBusy] = createSignal(false);

  async function exit() {
    setBusy(true);
    try {
      await stop();
      // The admin session cookie is restored server-side; reload to re-resolve
      // the app under the administrator identity.
      window.location.assign("/");
    } catch {
      setBusy(false);
    }
  }

  return (
    <Show when={currentUser().impersonating}>
      <div class={styles.banner}>
        <span class={styles.label}>
          Estás viendo la aplicación como {shortName(currentUser())}.
        </span>
        <Button
          size="sm"
          variant="secondary"
          loading={busy()}
          onClick={() => void exit()}
        >
          Salir de la suplantación
        </Button>
      </div>
    </Show>
  );
}
