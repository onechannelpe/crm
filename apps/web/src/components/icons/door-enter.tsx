import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M13 12v.01", key: "door-enter-1" }],
  ["path", { d: "M3 21h18", key: "door-enter-2" }],
  ["path", { d: "M5 21v-16a2 2 0 0 1 2 -2h6m4 10.5v7.5", key: "door-enter-3" }],
  ["path", { d: "M21 7h-7m3 -3l-3 3l3 3", key: "door-enter-4" }],
] as const;

const DoorEnter = createIcon("door-enter", iconNode);

export default DoorEnter;
