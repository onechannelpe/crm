import { Show } from "solid-js";

import { Loader } from "~/components/feedback/loading/loader";

import { LoginFeedback } from "./login-feedback";

import shellStyles from "./auth-flow-shell.module.css";
import linkStyles from "./auth-links.module.css";

interface LoginPasskeyPanelProps {
  error: string | undefined;
  busy: boolean;
  supported: boolean;
  hasActiveFlow: boolean;
  onRetry: () => void;
  onStart: () => void;
}

export function LoginPasskeyPanel(props: LoginPasskeyPanelProps) {
  return (
    <>
      <LoginFeedback message={props.error} />
      <Show when={props.busy}>
        <output class={shellStyles.loadingBlock} aria-live="polite">
          <p class={shellStyles.loadingLabel}>Esperando tu clave de acceso</p>
          <Loader />
        </output>
      </Show>
      <Show when={props.hasActiveFlow && !props.busy && props.supported}>
        <button
          type="button"
          class={linkStyles.helpLink}
          onClick={props.onRetry}
        >
          Reintentar con clave de acceso
        </button>
      </Show>
      <Show when={props.supported}>
        <button
          type="button"
          class={linkStyles.passkeyLink}
          onClick={props.onStart}
        >
          Usar clave de acceso
        </button>
      </Show>
    </>
  );
}
