import type { ParsedHistoryEntry } from "~/server/pipeline/domain/history";

import { presentTimelineItem, type TimelineItem } from "./timeline-item";

export type { TimelineItem };

export function presentTimeline(
  events: ParsedHistoryEntry[],
  revealFull: boolean,
): TimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
