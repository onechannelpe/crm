import type { JSX } from "solid-js";

import Inbox from "~/components/icons/inbox";

import styles from "./empty-state.module.css";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div class={styles.root}>
      <div class={styles.iconWrap}>
        <Inbox size={20} />
      </div>
      <h3 class={styles.title}>{props.title}</h3>
      {props.description && (
        <p class={styles.description}>{props.description}</p>
      )}
      {props.action}
    </div>
  );
}
