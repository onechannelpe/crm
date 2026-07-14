import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "axes" }],
  ["path", { d: "M7 15v3", key: "bar1" }],
  ["path", { d: "M12 9v9", key: "bar2" }],
  ["path", { d: "M17 5v13", key: "bar3" }],
] as const;

const ChartColumn = createIcon("chart-column", iconNode);

export default ChartColumn;
