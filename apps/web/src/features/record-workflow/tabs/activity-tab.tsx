import { Show, createMemo } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { EventList } from "~/features/side-panel/pages/record-page/tabs/timeline/components/event-list";
import { normalizeLeadEvent } from "~/features/side-panel/pages/record-page/tabs/timeline/model/event";
import { groupEventsByMonth } from "~/features/side-panel/pages/record-page/tabs/timeline/model/group";

import styles from "~/features/side-panel/pages/record-page/tabs/timeline/styles.module.css";

type ActivityTabProps = {
  data: LeadDetailView;
};

export function ActivityTab(props: ActivityTabProps) {
  const groups = createMemo(() => {
    const normalized = props.data.timeline
      .toSorted((a, b) => b.occurredAt - a.occurredAt)
      .map(normalizeLeadEvent);

    return groupEventsByMonth(normalized);
  });

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
        <EventList id={props.data.lead.id} groups={groups()} />
      </Show>
    </div>
  );
}
