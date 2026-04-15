import { createMemo, For, Show } from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import Package from "~/components/icons/package";
import Phone from "~/components/icons/phone";
import Plus from "~/components/icons/plus";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import {
  ActivityRowDescription,
  ActivityRowTitle,
  ActivityTabContainer,
  ActivityTimeline,
  ActivityTimelineGroup,
  ActivityTimelineRow,
  ActivityTimelineRowBody,
  ActivityTimelineRowLeft,
} from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

type TimelineKind = LeadDetailView["timeline"][number]["kind"];

type DraftTimelineItem = {
  id: string;
  action: string;
  subject: string;
  meta: string;
};

type TimelineGroup = {
  year: number;
  month: number;
  monthLabel: string;
  items: LeadDetailView["timeline"];
};

function deriveDraftTimeline(props: {
  ruc?: string;
  engineStatus?: string;
}): DraftTimelineItem[] {
  return [
    {
      id: "draft-open",
      action: "opened",
      subject: "lead draft",
      meta: "Ready for RUC input",
    },
    {
      id: "ruc-state",
      action: "updated",
      subject: props.ruc?.trim() ? `RUC ${props.ruc.trim()}` : "RUC state",
      meta: props.engineStatus ?? "Engine bootstrap pending",
    },
  ];
}

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
  const createItems = createMemo(() =>
    props.mode === "create"
      ? deriveDraftTimeline({
          ruc: props.ruc,
          engineStatus: props.engineStatus,
        })
      : [],
  );

  const grouped = createMemo(() =>
    props.mode === "view" ? groupByMonth(props.data.timeline) : [],
  );

  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const dateLabel = formatDateTime(Date.now());

  if (props.mode === "create") {
    return (
      <ActivityTabContainer>
        <ActivityTimeline>
          <ActivityTimelineGroup month={month} year={year}>
            <For each={createItems()}>
              {(item, i) => (
                <ActivityTimelineRow>
                  <ActivityTimelineRowLeft
                    icon={<Plus size={14} />}
                    isLast={i() === createItems().length - 1}
                  />
                  <ActivityTimelineRowBody
                    author="System"
                    action={item.action}
                    date={dateLabel}
                  >
                    <ActivityRowTitle>{item.subject}</ActivityRowTitle>
                    <Show when={item.meta}>
                      {(meta) => (
                        <ActivityRowDescription>
                          {meta()}
                        </ActivityRowDescription>
                      )}
                    </Show>
                  </ActivityTimelineRowBody>
                </ActivityTimelineRow>
              )}
            </For>
          </ActivityTimelineGroup>
        </ActivityTimeline>
      </ActivityTabContainer>
    );
  }

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
                      <ActivityTimelineRow>
                        <ActivityTimelineRowLeft
                          icon={timelineIcon(item.kind)}
                          isLast={i() === group.items.length - 1}
                        />
                        <ActivityTimelineRowBody
                          author={item.actorDisplayName}
                          action={timelineActionLabel(item.kind)}
                          date={formatDateTime(item.occurredAt)}
                        >
                          <ActivityRowTitle>{item.title}</ActivityRowTitle>
                          <Show
                            when={
                              item.description.trim().length > 0 &&
                              item.description !== item.title
                                ? item.description
                                : undefined
                            }
                          >
                            {(description) => (
                              <ActivityRowDescription>
                                {description()}
                              </ActivityRowDescription>
                            )}
                          </Show>
                        </ActivityTimelineRowBody>
                      </ActivityTimelineRow>
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
