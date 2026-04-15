import { type ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function TimelineSection(props: ParentProps) {
  return <div class={styles.timelineSection}>{props.children}</div>;
}

export function TimelineMonth(props: ParentProps) {
  return <div class={styles.timelineMonth}>{props.children}</div>;
}

export function TimelineEntry(props: ParentProps) {
  return <div class={styles.timelineEntry}>{props.children}</div>;
}

export function TimelineIcon(props: ParentProps) {
  return <div class={styles.timelineIcon}>{props.children}</div>;
}

export function TimelineBody(props: ParentProps) {
  return <div class={styles.timelineBody}>{props.children}</div>;
}

export function TimelineTitle(props: ParentProps) {
  return <div class={styles.timelineTitle}>{props.children}</div>;
}

export function TimelineMeta(props: ParentProps) {
  return <div class={styles.timelineMeta}>{props.children}</div>;
}

export function TimelineDescription(props: ParentProps) {
  return <div class={styles.timelineDescription}>{props.children}</div>;
}
