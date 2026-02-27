import { type JSX, Show } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "../../routes/(app)/settings/settings-page.module.css";

interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: (props: { size?: number; class?: string }) => JSX.Element;
  status?: {
    text: string;
    active: boolean;
  };
  href?: string;
  onClick?: () => void;
}

export function SettingsCard(props: SettingsCardProps) {
  const content = (
    <div class={styles.cardItem}>
      <div class={styles.cardMain}>
        <div class={styles.inline}>
          {props.icon && <props.icon size={16} class={styles.cardIcon} />}
          <span class={styles.cardTitle}>{props.title}</span>
        </div>
        {props.description && (
          <p class={styles.cardDescription}>{props.description}</p>
        )}
      </div>
      <Show when={props.status}>
        <span
          class={cn(
            styles.statusIndicator,
            props.status?.active ? styles.statusActive : styles.statusInactive,
          )}
        >
          {props.status?.text}
        </span>
      </Show>
    </div>
  );

  return <div class={styles.card}>{content}</div>;
}
