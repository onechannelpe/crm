import type { JSX } from "solid-js";
import { Show } from "solid-js";

import styles from "./widget-shell.module.css";

export function WidgetShell(props: {
  title: string;
  subtitle?: string;
  action?: JSX.Element;
  children: JSX.Element;
}) {
  return (
    <section class={styles.card}>
      <header class={styles.header}>
        <div>
          <h2 class={styles.title}>{props.title}</h2>
          <Show when={props.subtitle}>
            <p class={styles.subtitle}>{props.subtitle}</p>
          </Show>
        </div>
        <Show when={props.action}>{props.action}</Show>
      </header>
      <div class={styles.body}>{props.children}</div>
    </section>
  );
}
