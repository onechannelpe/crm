import { Show } from "solid-js";

import pageStyles from "~/routes/auth/login-page.module.css";

interface LoginFeedbackProps {
  message: string | undefined;
}

export function LoginFeedback(props: LoginFeedbackProps) {
  return (
    <Show when={props.message}>
      {(message) => (
        <p class={pageStyles.formError} role="alert">
          {message()}
        </p>
      )}
    </Show>
  );
}
