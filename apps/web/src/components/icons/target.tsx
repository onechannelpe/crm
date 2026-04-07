import { createIcon } from "./create-icon";

const iconNode = [
  ["circle", { cx: "12", cy: "12", r: "1", key: "target-1" }],
  ["circle", { cx: "12", cy: "12", r: "5", key: "target-2" }],
  ["circle", { cx: "12", cy: "12", r: "9", key: "target-3" }],
] as const;

const Target = createIcon("target", iconNode);

export default Target;
