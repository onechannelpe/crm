import { onMount, Show, type JSX } from "solid-js";

import { initializeThemeMode } from "~/components/ui/theme/theme-mode";

import styles from "./auth-flow-shell.module.css";

interface AuthFlowShellProps {
  title: string;
  description?: string;
  topBar?: JSX.Element;
  footer?: JSX.Element;
  footerNote?: JSX.Element;
  children: JSX.Element;
}

export function AuthFlowShell(props: AuthFlowShellProps) {
  onMount(() => {
    initializeThemeMode();
  });

  return (
    <div class={styles.shell}>
      <section class={styles.surface}>
        <Show when={props.topBar !== undefined}>
          <div class={styles.topBar}>{props.topBar}</div>
        </Show>
        <div class={styles.content}>
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

          <div class={styles.body}>{props.children}</div>

          <Show when={props.footer !== undefined}>
            <footer class={styles.footer}>{props.footer}</footer>
          </Show>

          <Show when={props.footerNote !== undefined}>
            <div class={styles.footerNote}>{props.footerNote}</div>
          </Show>
        </div>
      </section>
    </div>
  );
}
