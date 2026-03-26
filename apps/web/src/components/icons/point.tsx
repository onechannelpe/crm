import { createIcon } from "./create-icon";

const iconNode = [
  ["circle", { cx: "12", cy: "12", r: "4", key: "point-circle" }],
] as const;

const Point = createIcon("point", iconNode);

export default Point;
