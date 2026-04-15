import { For, Show } from "solid-js";

import Plus from "~/components/icons/plus";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";

import contentStyles from "../../components/activity-tabs/content.module.css";

type DraftTimelineItem = {
  id: string;
  action: string;
  subject: string;
  meta: string;
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

export function TimelineTabContent(props: {
  ruc?: string;
  engineStatus?: string;
}) {
  const items = deriveDraftTimeline(props);

  if (items.length === 0) {
    return (
      <ActivityTabContainer>
        <ActivityTabEmptyState
          type="emptyTimeline"
          title="No activity yet"
          subtitle="There is no activity associated with this record."
        />
      </ActivityTabContainer>
    );
  }

  return (
    <ActivityTabContainer>
      <div class={contentStyles.timelineMainContainer}>
        <section class={contentStyles.timelineGroup}>
          <header class={contentStyles.timelineGroupHeader}>
            <span>{new Date().toLocaleString("en-US", { month: "long" })}</span>
            <span class={contentStyles.timelineGroupYear}>
              {new Date().getFullYear()}
            </span>
            <div class={contentStyles.timelineGroupHeaderLine} />
          </header>
          <div class={contentStyles.timelineFeed}>
            <For each={items}>
              {(item, itemIndex) => (
                <div class={contentStyles.timelineRow}>
                  <div class={contentStyles.timelineRowLeft}>
                    <div class={contentStyles.timelineRowIcon}>
                      <Plus size={14} />
                    </div>
                    <Show when={itemIndex() !== items.length - 1}>
                      <div class={contentStyles.timelineRowLineWrap}>
                        <div class={contentStyles.timelineRowLine} />
                      </div>
                    </Show>
                  </div>
                  <div class={contentStyles.timelineRowBody}>
                    <div class={contentStyles.timelineRowTop}>
                      <div class={contentStyles.timelineRowTopLeft}>
                        <span class={contentStyles.timelineRowAuthor}>
                          System
                        </span>
                        <span class={contentStyles.timelineRowAction}>
                          {item.action}
                        </span>
                        <span class={contentStyles.timelineRowTitle}>
                          {item.subject}
                        </span>
                      </div>
                      <span class={contentStyles.timelineRowDate}>
                        {formatDateTime(Date.now())}
                      </span>
                    </div>
                    <div class={contentStyles.timelineRowDescription}>
                      {item.meta}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>
      </div>
    </ActivityTabContainer>
  );
}
