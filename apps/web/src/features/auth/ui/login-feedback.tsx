import { Show } from "solid-js";

import styles from "./login-feedback.module.css";

interface LoginFeedbackProps {
  message: string | undefined;
}

export function LoginFeedback(props: LoginFeedbackProps) {
  return (
    <Show when={props.message}>
      {(message) => (
        <p class={styles.formError} role="alert">
          {message()}
        </p>
      )}
    </Show>
  );
}
