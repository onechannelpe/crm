import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1",
      key: "tl",
    },
  ],
  [
    "path",
    {
      d: "M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",
      key: "bl",
    },
  ],
  [
    "path",
    {
      d: "M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1",
      key: "br",
    },
  ],
  [
    "path",
    {
      d: "M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",
      key: "tr",
    },
  ],
] as const;

const LayoutDashboard = createIcon("layout-dashboard", iconNode);

export default LayoutDashboard;
