import type { JSX } from "solid-js";

import Package from "~/components/icons/package";
import Phone from "~/components/icons/phone";
import Plus from "~/components/icons/plus";
import TimelineEvent from "~/components/icons/timeline-event";
import type { LeadTimelineItem } from "~/server/pipeline/application/queries/views/lead-detail";

export function eventIcon(kind: LeadTimelineItem["kind"]): JSX.Element {
  if (kind === "call") {
    return <Phone size={14} />;
  }

  if (kind === "stage-change") {
    return <Package size={14} />;
  }

  if (kind === "note") {
    return <Plus size={14} />;
  }

  return <TimelineEvent size={14} />;
}
