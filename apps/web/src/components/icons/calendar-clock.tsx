import { createIcon } from "./create-icon";

const iconNode = [
  [
    "rect",
    {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2",
      key: "calendar-clock-1",
    },
  ],
  ["path", { d: "M16 2v4", key: "calendar-clock-2" }],
  ["path", { d: "M8 2v4", key: "calendar-clock-3" }],
  ["path", { d: "M3 10h18", key: "calendar-clock-4" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "calendar-clock-5" }],
  ["path", { d: "M17 16v1.5l1 0.5", key: "calendar-clock-6" }],
] as const;

const CalendarClock = createIcon("calendar-clock", iconNode);

export default CalendarClock;
