import { For, Show } from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import Package from "~/components/icons/package";
import Phone from "~/components/icons/phone";
import {
  TimelineBody,
  TimelineDescription,
  TimelineEntry,
  TimelineIcon,
  TimelineMeta,
  TimelineMonth,
  TimelineSection,
  TimelineTitle,
} from "~/features/side-panel/components/timeline";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

function timelineIconComponent(
  kind: LeadDetailView["timeline"][number]["kind"],
) {
  if (kind === "call") return <Phone size={12} />;
  if (kind === "stage-change") return <Package size={12} />;
  return <CalendarDays size={12} />;
}

export function TimelineTabContent(props: { data: LeadDetailView }) {
  return (
    <TimelineSection>
      <TimelineMonth>Línea de tiempo</TimelineMonth>
      <For each={props.data.timeline}>
        {(item) => (
          <TimelineEntry>
            <TimelineIcon>{timelineIconComponent(item.kind)}</TimelineIcon>
            <TimelineBody>
              <TimelineTitle>{item.title}</TimelineTitle>
              <TimelineMeta>
                {item.actorDisplayName} · {formatDateTime(item.occurredAt)}
              </TimelineMeta>
              <TimelineDescription>{item.description}</TimelineDescription>
            </TimelineBody>
          </TimelineEntry>
        )}
      </For>
      <Show when={props.data.timeline.length === 0}>
        <TimelineEntry>
          <TimelineIcon>
            <CalendarDays size={12} />
          </TimelineIcon>
          <TimelineBody>
            <TimelineTitle>Sin actividad registrada</TimelineTitle>
            <TimelineMeta>El lead aún no tiene historial</TimelineMeta>
          </TimelineBody>
        </TimelineEntry>
      </Show>
    </TimelineSection>
  );
}
