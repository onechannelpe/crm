import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
      key: "frame",
    },
  ],
  ["path", { d: "M9 4v16", key: "divider" }],
  ["path", { d: "M15 10l-2 2l2 2", key: "arrow-left" }],
] as const;

const LayoutSidebarLeftCollapse = createIcon(
  "LayoutSidebarLeftCollapse",
  iconNode,
);

export default LayoutSidebarLeftCollapse;
