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

export function ActivityRowDescription(props: ParentProps) {
  return <div class={styles.rowDescription}>{props.children}</div>;
}

export function ActivityRowEnd(props: ParentProps) {
  return <div class={styles.rowEnd}>{props.children}</div>;
}

export function ActivityGrid(props: ParentProps) {
  return <div class={styles.grid}>{props.children}</div>;
}

export function ActivityTile(
  props: ParentProps<{
    footer?: JSX.Element;
    onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>;
  }>,
) {
  return (
    <article class={styles.tile}>
      <Show
        when={props.onClick}
        fallback={<div class={styles.tileBody}>{props.children}</div>}
      >
        {(onClick) => (
          <button
            type="button"
            class={cn(styles.tileBody, styles.tileBodyClickable)}
            onClick={
              onClick() as JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
            }
          >
            {props.children}
          </button>
        )}
      </Show>
      {props.footer ? (
        <div class={styles.tileFooter}>{props.footer}</div>
      ) : null}
    </article>
  );
}

export function ActivityTimeline(props: ParentProps) {
  return <div class={styles.timelineMainContainer}>{props.children}</div>;
}

export function ActivityTimelineGroup(
  props: ParentProps<{
    month: string;
    year?: number;
  }>,
) {
  return (
    <section class={styles.timelineGroup}>
      <header class={styles.timelineGroupHeader}>
        <span>{props.month}</span>
        <Show when={typeof props.year === "number"}>
          <span class={styles.timelineGroupYear}>{props.year}</span>
        </Show>
        <div class={styles.timelineGroupHeaderLine} />
      </header>
      <div class={styles.timelineFeed}>{props.children}</div>
    </section>
  );
}

export function ActivityTimelineRow(props: {
  icon: JSX.Element;
  author: string;
  action: string;
  title: string;
  date: string;
  description?: string;
  isLast?: boolean;
}) {
  return (
    <div class={styles.timelineRow}>
      <div class={styles.timelineRowLeft}>
        <div class={styles.timelineRowIcon}>{props.icon}</div>
        {!props.isLast ? (
          <div class={styles.timelineRowLineWrap}>
            <div class={styles.timelineRowLine} />
          </div>
        ) : null}
      </div>
      <div class={styles.timelineRowBody}>
        <div class={styles.timelineRowTop}>
          <div class={styles.timelineRowTopLeft}>
            <span class={styles.timelineRowAuthor}>{props.author}</span>
            <span class={styles.timelineRowAction}>{props.action}</span>
            <span class={styles.timelineRowTitle}>{props.title}</span>
          </div>
          <span class={styles.timelineRowDate}>{props.date}</span>
        </div>
        {props.description ? (
          <div class={styles.timelineRowDescription}>{props.description}</div>
        ) : null}
      </div>
    </div>
  );
}
