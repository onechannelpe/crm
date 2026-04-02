import type { LeadHistoryEntry } from "~/server/pipeline/domain/history";

import { presentTimelineItem, type TimelineItem } from "./timeline-item";

export type { TimelineItem };

export function presentTimeline(
  events: LeadHistoryEntry[],
  revealFull: boolean,
): TimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
