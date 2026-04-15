import type { JSX, ParentProps } from "solid-js";

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
    clickable?: boolean;
    onClick?: JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>;
  }>,
) {
  return (
    <div
      class={cn(styles.listRow, props.clickable ? styles.listRowClickable : "")}
      onClick={props.onClick}
    >
      {props.children}
    </div>
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

export function ActivityRowDescription(props: ParentProps) {
  return <div class={styles.rowDescription}>{props.children}</div>;
}

export function ActivityGrid(props: ParentProps) {
  return <div class={styles.grid}>{props.children}</div>;
}

export function ActivityTile(
  props: ParentProps<{
    footer?: JSX.Element;
    onClick?: JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>;
  }>,
) {
  return (
    <article class={styles.tile}>
      <div
        class={cn(
          styles.tileBody,
          props.onClick ? styles.tileBodyClickable : "",
        )}
        onClick={props.onClick}
      >
        {props.children}
      </div>
      {props.footer ? (
        <div class={styles.tileFooter}>{props.footer}</div>
      ) : null}
    </article>
  );
}
