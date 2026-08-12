import { Show, createMemo } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import { EventList } from "~/features/record-show/tabs/timeline/components/event-list";
import { buildCreateGroups } from "~/features/record-show/tabs/timeline/model/create";
import { normalizeLeadEvent } from "~/features/record-show/tabs/timeline/model/event";
import { groupEventsByMonth } from "~/features/record-show/tabs/timeline/model/group";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";

import styles from "~/features/record-show/tabs/timeline/styles.module.css";

export function ActividadTab(props: { context: RecordContext }) {
  // Keep the draft timestamp stable while the tab is mounted.
  const openedAt = Date.now();

  const groups = createMemo(() => {
    const context = props.context;

    if (context.kind === "draft") {
      return buildCreateGroups({
        ruc: context.ruc,
        engineStatus: context.engineStatus,
        openedAt,
      });
    }

    return groupEventsByMonth(
      context.data.timeline
        .filter((event) => event.kind !== "note")
        .toSorted((a, b) => b.occurredAt - a.occurredAt)
        .map(normalizeLeadEvent),
    );
  });

  const eventListId = () =>
    props.context.kind === "draft" ? "draft" : props.context.data.lead.id;

  return (
    <div class={styles.mainContainer}>
      <Show
        when={groups().length > 0}
        fallback={
          <ActivityTabEmptyState
            type="emptyTimeline"
            title="Aún no hay actividad"
            subtitle="No hay actividad asociada a este registro."
          />
        }
      >
        <EventList id={eventListId()} groups={groups()} />
      </Show>
    </div>
  );
}
