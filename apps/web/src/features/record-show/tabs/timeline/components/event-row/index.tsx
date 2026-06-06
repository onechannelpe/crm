import { Show } from "solid-js";

import type { Event } from "../../model/event";
import { EventRowContent } from "./content";
import { eventIcon } from "./icon";

import styles from "./styles.module.css";

type EventRowProps = {
  event: Event;
  isLast: boolean;
};

export function EventRow(props: EventRowProps) {
  return (
    <div class={styles.row}>
      <div class={styles.leftContainer}>
        <div class={styles.iconContainer}>{eventIcon(props.event.kind)}</div>
        <Show when={!props.isLast}>
          <div class={styles.verticalLineContainer}>
            <div class={styles.verticalLine} />
          </div>
        </Show>
      </div>

      <div
        class={styles.itemContainer}
        style={{
          "margin-bottom": props.isLast ? "0" : "var(--spacing-3)",
        }}
      >
        <EventRowContent event={props.event} />
      </div>
    </div>
  );
}
