import type { LeadHistoryEntry } from "~/server/pipeline/domain/history";

import type { TimelineItem } from "../../contracts/lead-detail";
import { presentTimelineItem } from "./timeline-item";

export function presentTimeline(
  events: LeadHistoryEntry[],
  revealFull: boolean,
): TimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
