import type { LeadHistoryEntry } from "~/server/pipeline/domain/history";

import type { PipelineTimelineItem } from "../read-models/lead-detail";
import { presentTimelineItem } from "./timeline-item";

export function presentTimeline(
  events: LeadHistoryEntry[],
  revealFull: boolean,
): PipelineTimelineItem[] {
  return events.map((event) => presentTimelineItem(event, revealFull));
}
