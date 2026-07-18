import { Show, type JSX, type ParentProps } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./settings-option-card.module.css";

export function SettingsOptionCard(props: ParentProps) {
  return <div class={styles.card}>{props.children}</div>;
}

export function SettingsOptionCardRow(props: {
  title: string;
  description?: string;
  control: JSX.Element;
  interactive?: boolean;
}) {
  return (
    <div class={cn(styles.row, props.interactive && styles.rowInteractive)}>
      <div class={styles.text}>
        <span class={styles.title}>{props.title}</span>
        <Show when={props.description}>
          {(description) => (
            <span class={styles.description}>{description()}</span>
          )}
        </Show>
      </div>
      <span class={styles.control}>{props.control}</span>
    </div>
  );
}

export function SettingsOptionCardSeparator() {
  return <hr class={styles.separator} />;
}
