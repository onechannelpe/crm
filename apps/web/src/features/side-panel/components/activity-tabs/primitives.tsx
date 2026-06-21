import type { JSX, ParentProps } from "solid-js";
import { Show } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./primitives.module.css";

export function ActivityTabContainer(props: ParentProps) {
  return <div class={styles.container}>{props.children}</div>;
}

export function ActivitySection(
  props: ParentProps<{
    title: string;
    count?: number;
    action?: JSX.Element;
  }>,
) {
  return (
    <section class={styles.section}>
      <header class={styles.sectionHeader}>
        <h3 class={styles.sectionTitle}>
          {props.title}
          <span class={styles.sectionCount}>
            {typeof props.count === "number" ? props.count : null}
          </span>
        </h3>
        {props.action}
      </header>
      {props.children}
    </section>
  );
}

export function ActivityListCard(props: ParentProps) {
  return <div class={styles.listCard}>{props.children}</div>;
}

export function ActivityListRow(
  props: ParentProps<{
    onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>;
  }>,
) {
  return (
    <Show
      when={props.onClick}
      fallback={<div class={styles.listRow}>{props.children}</div>}
    >
      {(onClick) => (
        <button
          type="button"
          class={cn(styles.listRow, styles.listRowClickable)}
          onClick={
            onClick() as JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
          }
        >
          {props.children}
        </button>
      )}
    </Show>
  );
}

export function ActivityRowIcon(props: ParentProps) {
  return <div class={styles.rowIcon}>{props.children}</div>;
}

export function ActivityRowBody(props: ParentProps) {
  return <div class={styles.rowBody}>{props.children}</div>;
}

export function ActivityRowTitle(props: ParentProps) {
  return <div class={styles.rowTitle}>{props.children}</div>;
}

export function ActivityRowMeta(props: ParentProps) {
  return <div class={styles.rowMeta}>{props.children}</div>;
}

export function ActivityRowEnd(props: ParentProps) {
  return <div class={styles.rowEnd}>{props.children}</div>;
}
