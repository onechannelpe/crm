import { createIcon } from "./create-icon";

const iconNode = [
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1" }],
  ["path", { d: "M16 2v4", key: "2" }],
  ["path", { d: "M8 2v4", key: "3" }],
  ["path", { d: "M3 10h18", key: "4" }],
  ["path", { d: "M8 14h.01", key: "5" }],
  ["path", { d: "M12 14h.01", key: "6" }],
  ["path", { d: "M16 14h.01", key: "7" }],
  ["path", { d: "M8 18h.01", key: "8" }],
  ["path", { d: "M12 18h.01", key: "9" }],
  ["path", { d: "M16 18h.01", key: "10" }],
] as const;

const CalendarDays = createIcon("calendar-days", iconNode);

export default CalendarDays;
