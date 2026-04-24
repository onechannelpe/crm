import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M14 3v4a1 1 0 0 0 1 1h4", key: "export-1" }],
  [
    "path",
    {
      d: "M11.5 21h-4.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v5m-5 6h7m-3 -3l3 3l-3 3",
      key: "export-2",
    },
  ],
] as const;

const Export = createIcon("export", iconNode);

export default Export;
