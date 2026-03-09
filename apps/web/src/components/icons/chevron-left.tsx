import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "m15 18-6-6 6-6", key: "chevron-left" }],
] as const;

const ChevronLeft = createIcon("ChevronLeft", iconNode);

export default ChevronLeft;
