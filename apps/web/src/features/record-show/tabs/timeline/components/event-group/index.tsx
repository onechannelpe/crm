import { For } from "solid-js";

import { calendarMonthParts } from "~/domain/time/calendar-date";

import type { Group } from "../../model/group";
import { EventRow } from "../event-row";

import styles from "./styles.module.css";

export function EventGroup(props: {
  group: Group;
  monthLabel: string;
  showYear: boolean;
}) {
  return (
    <section class={styles.group}>
      <div class={styles.monthSeparator}>
        {props.monthLabel}
        {props.showYear && ` ${calendarMonthParts(props.group.month).year}`}
        <div class={styles.monthSeparatorLine} />
      </div>

      <div class={styles.groupContainer}>
        <div class={styles.groupBar} />

        <For each={props.group.items}>
          {(event, index) => (
            <EventRow
              event={event}
              isLast={index() === props.group.items.length - 1}
            />
          )}
        </For>
      </div>
    </section>
  );
}
