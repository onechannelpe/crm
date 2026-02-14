import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
] as const;

const CircleCheckBig = createIcon("circle-check-big", iconNode);

export default CircleCheckBig;
