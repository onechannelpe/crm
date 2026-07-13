import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12",
      key: "frame",
    },
  ],
  ["path", { d: "M9 4v16", key: "divider" }],
  ["path", { d: "M14 10l2 2l-2 2", key: "arrow-right" }],
] as const;

const LayoutSidebarLeftExpand = createIcon(
  "layout-sidebar-left-expand",
  iconNode,
);

export default LayoutSidebarLeftExpand;
