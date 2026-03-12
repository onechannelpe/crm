import { createIcon } from "./create-icon";

// Tabler IconActivity — classic heartbeat/activity monitor waveform.
const iconNode = [
  ["path", { d: "M3 12h4l3 8l4 -16l3 8h4", key: "activity" }],
] as const;

const Activity = createIcon("activity", iconNode);

export default Activity;
