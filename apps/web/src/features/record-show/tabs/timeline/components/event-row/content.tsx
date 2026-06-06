import { Show } from "solid-js";

import { formatDateTime } from "~/lib/utils";

import { isLinkedEvent, type Event } from "../../model/event";

import styles from "./styles.module.css";

type EventRowContentProps = {
  event: Event;
};

export function EventRowContent(props: EventRowContentProps) {
  const hasDescription = () =>
    Boolean(props.event.description) &&
    props.event.description !== props.event.subject;

  return (
    <div class={styles.summary}>
      <div class={styles.summaryRow}>
        <div class={styles.summaryMain}>
          <span class={styles.author}>{props.event.author}</span>
          <span class={styles.action}>{props.event.action}</span>
          <span
            class={
              isLinkedEvent(props.event) ? styles.linkedSubject : styles.subject
            }
          >
            {props.event.subject}
          </span>
        </div>
        <div class={styles.date}>{formatDateTime(props.event.createdAt)}</div>
      </div>

      <Show when={hasDescription()}>
        <div class={styles.details}>{props.event.description}</div>
      </Show>
    </div>
  );
}
