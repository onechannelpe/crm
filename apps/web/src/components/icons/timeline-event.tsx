import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M12 20m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
      key: "timeline-event-1",
    },
  ],
  ["path", { d: "M10 20h-6", key: "timeline-event-2" }],
  ["path", { d: "M14 20h6", key: "timeline-event-3" }],
  [
    "path",
    {
      d: "M12 15l-2 -2h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-3l-2 2z",
      key: "timeline-event-4",
    },
  ],
] as const;

const TimelineEvent = createIcon("timeline-event", iconNode);

export default TimelineEvent;
