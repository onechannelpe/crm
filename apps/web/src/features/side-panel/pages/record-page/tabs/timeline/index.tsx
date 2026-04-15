import { Show, createMemo } from "solid-js";

import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { EventList } from "./components/event-list";
import { buildCreateGroups } from "./model/create";
import { normalizeLeadEvent } from "./model/event";
import { groupEventsByMonth } from "./model/group";

import styles from "./styles.module.css";

type TimelineTabProps =
  | {
      mode: "create";
      ruc?: string;
      engineStatus?: string;
    }
  | {
      mode: "view";
      data: LeadDetailView;
    };

export function TimelineTab(props: TimelineTabProps) {
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
    props.mode === "create" ? "draft" : String(props.data.lead.id);

  return (
    <div class={styles.mainContainer}>
      <Show
        when={groups().length > 0}
        fallback={
          <ActivityTabEmptyState
            type="emptyTimeline"
            title="No activity yet"
            subtitle="There is no activity associated with this record."
          />
        }
      >
        <EventList id={eventListId()} groups={groups()} />
      </Show>
    </div>
  );
}
