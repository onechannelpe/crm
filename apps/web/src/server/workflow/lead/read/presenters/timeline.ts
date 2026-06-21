import type { LeadTimelineItem } from "~/contracts/workflow/views";
import type { LeadHistoryEntry } from "~/server/workflow/lead/domain/history";

import { presentTimelineItem } from "./timeline-item";

export function presentTimeline(
  events: LeadHistoryEntry[],
  revealFull: boolean,
): LeadTimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
