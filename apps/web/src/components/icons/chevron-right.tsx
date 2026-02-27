import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "m9 18 6-6-6-6", key: "chevron-right" }],
] as const;

const ChevronRight = createIcon("ChevronRight", iconNode);

export default ChevronRight;
