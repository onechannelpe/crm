import type { LeadTimelineItem } from "~/contracts/workflow";
import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import { presentTimelineItem } from "./timeline-item";

export function presentTimeline(
  events: LeadHistoryEntry[],
  revealFull: boolean,
): LeadTimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
