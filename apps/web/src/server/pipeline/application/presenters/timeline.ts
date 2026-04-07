import type { LeadHistoryEntry } from "~/server/pipeline/domain/history";

import type { LeadTimelineItem } from "../contracts";
import { presentTimelineItem } from "./timeline-item";

export function presentTimeline(
  events: LeadHistoryEntry[],
  revealFull: boolean,
): LeadTimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
