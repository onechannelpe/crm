import { Show, type JSX } from "solid-js";

import styles from "./auth-flow-shell.module.css";

interface AuthFlowShellProps {
  title: string;
  description?: string;
  footer?: JSX.Element;
  footerNote?: JSX.Element;
  children: JSX.Element;
}

export function AuthFlowShell(props: AuthFlowShellProps) {
  return (
    <div class={styles.shell}>
      <section class={styles.surface}>
        <div class={styles.content}>
          <header class={styles.header}>
            <div class={styles.logo}>
              <img
                src="/favicon.ico"
                alt="CRM"
                width="40"
                height="40"
                class={styles.logoImage}
              />
            </div>
            <h1 class={styles.title}>{props.title}</h1>
            <Show when={props.description}>
              <p class={styles.description}>{props.description}</p>
            </Show>
          </header>

          <div class={styles.body}>{props.children}</div>

          <Show when={props.footer}>
            <footer class={styles.footer}>{props.footer}</footer>
          </Show>

          <Show when={props.footerNote}>
            <div class={styles.footerNote}>{props.footerNote}</div>
          </Show>
        </div>
      </section>
    </div>
  );
}
