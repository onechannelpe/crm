import type { JSX } from "solid-js";
import { Show } from "solid-js";

import styles from "./panel.module.css";

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  action?: JSX.Element;
  children: JSX.Element;
  span?: "full" | "half";
}

export function WidgetCard(props: WidgetCardProps) {
  return (
    <section
      class={styles.card}
      classList={{ [styles.full]: props.span !== "half" }}
    >
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

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "warning";
}

export function StatTile(props: StatTileProps) {
  return (
    <div class={styles.tile}>
      <span class={styles.tileLabel}>{props.label}</span>
      <span
        class={styles.tileValue}
        classList={{
          [styles.positive]: props.tone === "positive",
          [styles.warning]: props.tone === "warning",
        }}
      >
        {props.value}
      </span>
      <Show when={props.hint}>
        <span class={styles.tileHint}>{props.hint}</span>
      </Show>
    </div>
  );
}
