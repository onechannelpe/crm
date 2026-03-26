import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M9 6h11", key: "1" }],
  ["path", { d: "M9 12h11", key: "2" }],
  ["path", { d: "M9 18h11", key: "3" }],
  ["path", { d: "M5 6h.01", key: "4" }],
  ["path", { d: "M5 12h.01", key: "5" }],
  ["path", { d: "M5 18h.01", key: "6" }],
] as const;

const List = createIcon("list", iconNode);

export default List;
