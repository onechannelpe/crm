import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", key: "dots-1" }],
  ["path", { d: "M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", key: "dots-2" }],
  ["path", { d: "M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", key: "dots-3" }],
] as const;

const DotsVertical = createIcon("dots-vertical", iconNode);

export default DotsVertical;
