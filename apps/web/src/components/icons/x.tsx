import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
] as const;

const X = createIcon("x", iconNode);

export default X;
