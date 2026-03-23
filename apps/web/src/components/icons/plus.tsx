import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M5 12h14", key: "plus-h" }],
  ["path", { d: "M12 5v14", key: "plus-v" }],
] as const;

const Plus = createIcon("plus", iconNode);

export default Plus;
