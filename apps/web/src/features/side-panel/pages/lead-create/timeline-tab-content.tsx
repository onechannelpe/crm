import { createMemo, For } from "solid-js";

import Plus from "~/components/icons/plus";
import {
  ActivityTabContainer,
  ActivityTimeline,
  ActivityTimelineGroup,
  ActivityTimelineRow,
} from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";

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
  const items = createMemo(() => deriveDraftTimeline(props));

  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const dateLabel = formatDateTime(Date.now());

  return (
    <ActivityTabContainer>
      <ActivityTimeline>
        <ActivityTimelineGroup month={month} year={year}>
          <For each={items()}>
            {(item, i) => (
              <ActivityTimelineRow
                icon={<Plus size={14} />}
                author="System"
                action={item.action}
                title={item.subject}
                date={dateLabel}
                description={item.meta}
                isLast={i() === items().length - 1}
              />
            )}
          </For>
        </ActivityTimelineGroup>
      </ActivityTimeline>
    </ActivityTabContainer>
  );
}
