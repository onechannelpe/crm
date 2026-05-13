import { Show, createMemo } from "solid-js";

import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";

import type { TabContentProps } from "./content-props";
import { EventList } from "./timeline/components/event-list";
import { buildCreateGroups } from "./timeline/model/create";
import { normalizeLeadEvent } from "./timeline/model/event";
import { groupEventsByMonth } from "./timeline/model/group";

import styles from "./timeline/styles.module.css";

export function ActivityTab(props: TabContentProps) {
  const groups = createMemo(() => {
    if (props.mode === "create") {
      return buildCreateGroups({
        ruc: props.ruc,
        engineStatus: props.engineStatus,
      });
    }

    const normalized = props.data.timeline
      .toSorted((a, b) => b.occurredAt - a.occurredAt)
      .map(normalizeLeadEvent);

    return groupEventsByMonth(normalized);
  });

  const eventListId = () =>
    props.mode === "create" ? "draft" : props.data.lead.id;

  return (
    <div class={styles.mainContainer}>
      <Show
        when={groups().length > 0}
        fallback={
          <ActivityTabEmptyState
            type="emptyTimeline"
            title="Aun no hay actividad"
            subtitle="No hay actividad asociada a este registro."
          />
        }
      >
        <EventList id={eventListId()} groups={groups()} />
      </Show>
    </div>
  );
}
