import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import type { LeadTimelineItem } from "../queries/views/lead-detail";
import { presentTimelineItem } from "./timeline-item";

export function presentTimeline(
  events: LeadHistoryEntry[],
  revealFull: boolean,
): LeadTimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
