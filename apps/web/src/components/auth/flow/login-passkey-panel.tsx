import { Show } from "solid-js";

import { AuthLoadingBlock } from "./auth-loading-block";
import { LoginFeedback } from "./login-feedback";

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
        <AuthLoadingBlock label="Esperando tu clave de acceso" />
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
