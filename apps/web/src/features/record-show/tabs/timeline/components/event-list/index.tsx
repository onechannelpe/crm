import { For } from "solid-js";

import { APP_LOCALE } from "~/lib/locale";

import type { Group } from "../../model/group";
import { EventGroup } from "../event-group";

import styles from "./styles.module.css";

type EventListProps = {
  id: string;
  groups: Group[];
};

export function EventList(props: EventListProps) {
  return (
    <div
      id={`scroll-wrapper-scroll-wrapper-event-list-${props.id}`}
      class={`${styles.scrollWrapper} scroll-wrapper-x-enabled scroll-wrapper-y-enabled`}
    >
      <div class={styles.container}>
        <For each={props.groups}>
          {(group, index) => {
            const monthLabel = new Date(
              group.items[0]?.createdAt ?? Date.now(),
            ).toLocaleString(APP_LOCALE, { month: "long" });

            const showYear =
              index() === 0 || props.groups[index() - 1].year !== group.year;

            return (
              <EventGroup
                group={group}
                monthLabel={monthLabel}
                showYear={showYear}
              />
            );
          }}
        </For>
      </div>
    </div>
  );
}
