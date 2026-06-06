import { For } from "solid-js";

import type { Group } from "../../model/group";
import { EventRow } from "../event-row";

import styles from "./styles.module.css";

type EventGroupProps = {
  group: Group;
  monthLabel: string;
  showYear: boolean;
};

export function EventGroup(props: EventGroupProps) {
  return (
    <section class={styles.group}>
      <div class={styles.monthSeparator}>
        {props.monthLabel} {props.showYear ? props.group.year : ""}
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
