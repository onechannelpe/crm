import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "m18 15-6-6-6 6", key: "chevron-up-key" }],
] as const;

const ChevronUp = createIcon("chevron-up", iconNode);

export default ChevronUp;
