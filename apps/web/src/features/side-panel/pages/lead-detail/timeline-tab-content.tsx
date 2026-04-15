import { For, Show } from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import Package from "~/components/icons/package";
import Phone from "~/components/icons/phone";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import {
  ActivityTabContainer,
  ActivityTimeline,
  ActivityTimelineGroup,
  ActivityTimelineRow,
} from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

type TimelineKind = LeadDetailView["timeline"][number]["kind"];

function timelineIcon(kind: TimelineKind) {
  if (kind === "call") return <Phone size={14} />;
  if (kind === "stage-change") return <Package size={14} />;
  return <CalendarDays size={14} />;
}

function timelineActionLabel(kind: TimelineKind) {
  switch (kind) {
    case "call":
      return "logged a call";
    case "note":
      return "added a note";
    case "assignment":
      return "updated assignment";
    case "stage-change":
      return "changed stage";
    case "system":
    default:
      return "updated the record";
  }
}

type TimelineGroup = {
  year: number;
  month: number;
  monthLabel: string;
  items: LeadDetailView["timeline"];
};

function groupByMonth(
  items: LeadDetailView["timeline"],
  locale = "en-US",
): TimelineGroup[] {
  const groups: TimelineGroup[] = [];

  for (const item of items) {
    const date = new Date(item.occurredAt);
    const year = date.getFullYear();
    const month = date.getMonth();

    const current = groups[groups.length - 1];
    if (current && current.year === year && current.month === month) {
      current.items.push(item);
      continue;
    }

    groups.push({
      year,
      month,
      monthLabel: date.toLocaleString(locale, { month: "long" }),
      items: [item],
    });
  }

  return groups;
}

export function TimelineTabContent(props: { data: LeadDetailView }) {
  const grouped = () => groupByMonth(props.data.timeline);

  return (
    <ActivityTabContainer>
      <Show
        when={props.data.timeline.length > 0}
        fallback={
          <ActivityTabEmptyState
            type="emptyTimeline"
            title="No activity yet"
            subtitle="There is no activity associated with this record."
          />
        }
      >
        <ActivityTimeline>
          <For each={grouped()}>
            {(group, index) => {
              const showYear = () =>
                index() === 0 || grouped()[index() - 1].year !== group.year;

              return (
                <ActivityTimelineGroup
                  month={group.monthLabel}
                  year={showYear() ? group.year : undefined}
                >
                  <For each={group.items}>
                    {(item, i) => (
                      <ActivityTimelineRow
                        icon={timelineIcon(item.kind)}
                        author={item.actorDisplayName}
                        action={timelineActionLabel(item.kind)}
                        title={item.title}
                        date={formatDateTime(item.occurredAt)}
                        description={
                          item.description.trim().length > 0 &&
                          item.description !== item.title
                            ? item.description
                            : undefined
                        }
                        isLast={i() === group.items.length - 1}
                      />
                    )}
                  </For>
                </ActivityTimelineGroup>
              );
            }}
          </For>
        </ActivityTimeline>
      </Show>
    </ActivityTabContainer>
  );
}
