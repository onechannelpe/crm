import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z", key: "moon-body" }],
] as const;

const Moon = createIcon("moon", iconNode);

export default Moon;
