import type { TimelineItem } from "~/actions/pipeline/contracts/lead-detail";
import type { LeadHistoryEntry } from "~/server/pipeline/domain/history";

import { presentTimelineItem } from "./timeline-item";

export function presentTimeline(
  events: LeadHistoryEntry[],
  revealFull: boolean,
): TimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
