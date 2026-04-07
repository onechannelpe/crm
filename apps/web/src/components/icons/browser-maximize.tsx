import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M4 8h8", key: "browser-maximize-1" }],
  [
    "path",
    {
      d: "M20 11.5v6.5a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h6.5",
      key: "browser-maximize-2",
    },
  ],
  ["path", { d: "M8 4v4", key: "browser-maximize-3" }],
  ["path", { d: "M16 8l5 -5", key: "browser-maximize-4" }],
  ["path", { d: "M21 7.5v-4.5h-4.5", key: "browser-maximize-5" }],
] as const;

const BrowserMaximize = createIcon("browser-maximize", iconNode);

export default BrowserMaximize;
