import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
      key: "frame",
    },
  ],
  ["path", { d: "M15 4v16", key: "divider" }],
  ["path", { d: "M9 10l2 2l-2 2", key: "arrow-right" }],
] as const;

const LayoutSidebarRightCollapse = createIcon(
  "LayoutSidebarRightCollapse",
  iconNode,
);

export default LayoutSidebarRightCollapse;
