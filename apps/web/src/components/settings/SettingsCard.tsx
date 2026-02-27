import { A } from "@solidjs/router";
import { type JSX, Match, Show, Switch } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
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
      <Show when={props.href || props.onClick}>
        <ChevronRight size={14} class={styles.cardIcon} />
      </Show>
    </div>
  );

  return (
    <Switch>
      <Match when={props.href}>
        <A href={props.href!} class={styles.card} aria-label={props.title}>
          {content}
        </A>
      </Match>
      <Match when={props.onClick}>
        <button
          type="button"
          class={styles.card}
          onClick={props.onClick}
          aria-label={props.title}
        >
          {content}
        </button>
      </Match>
      <Match when={true}>
        <div class={styles.card}>{content}</div>
      </Match>
    </Switch>
  );
}
