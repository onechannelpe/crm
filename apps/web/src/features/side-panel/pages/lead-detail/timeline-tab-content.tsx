import { For, Show } from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import Package from "~/components/icons/package";
import Phone from "~/components/icons/phone";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import contentStyles from "../../components/activity-tabs/content.module.css";

function timelineIconComponent(
  kind: LeadDetailView["timeline"][number]["kind"],
) {
  if (kind === "call") return <Phone size={14} />;
  if (kind === "stage-change") return <Package size={14} />;
  return <CalendarDays size={14} />;
}

function timelineActionLabel(kind: LeadDetailView["timeline"][number]["kind"]) {
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
        <div class={contentStyles.timelineMainContainer}>
          <For each={grouped()}>
            {(group, index) => {
              const prev = () => grouped()[index() - 1];
              const showYear = () => !prev() || prev()!.year !== group.year;

              return (
                <section class={contentStyles.timelineGroup}>
                  <header class={contentStyles.timelineGroupHeader}>
                    <span>{group.monthLabel}</span>
                    <Show when={showYear()}>
                      <span class={contentStyles.timelineGroupYear}>
                        {group.year}
                      </span>
                    </Show>
                    <div class={contentStyles.timelineGroupHeaderLine} />
                  </header>
                  <div class={contentStyles.timelineFeed}>
                    <For each={group.items}>
                      {(item, itemIndex) => (
                        <div class={contentStyles.timelineRow}>
                          <div class={contentStyles.timelineRowLeft}>
                            <div class={contentStyles.timelineRowIcon}>
                              {timelineIconComponent(item.kind)}
                            </div>
                            <Show when={itemIndex() !== group.items.length - 1}>
                              <div class={contentStyles.timelineRowLineWrap}>
                                <div class={contentStyles.timelineRowLine} />
                              </div>
                            </Show>
                          </div>
                          <div class={contentStyles.timelineRowBody}>
                            <div class={contentStyles.timelineRowTop}>
                              <div class={contentStyles.timelineRowTopLeft}>
                                <span class={contentStyles.timelineRowAuthor}>
                                  {item.actorDisplayName}
                                </span>
                                <span class={contentStyles.timelineRowAction}>
                                  {timelineActionLabel(item.kind)}
                                </span>
                                <span class={contentStyles.timelineRowTitle}>
                                  {item.title}
                                </span>
                              </div>
                              <span class={contentStyles.timelineRowDate}>
                                {formatDateTime(item.occurredAt)}
                              </span>
                            </div>
                            <Show
                              when={
                                item.description.trim().length > 0 &&
                                item.description !== item.title
                              }
                            >
                              <div class={contentStyles.timelineRowDescription}>
                                {item.description}
                              </div>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </section>
              );
            }}
          </For>
        </div>
      </Show>
    </ActivityTabContainer>
  );
}
