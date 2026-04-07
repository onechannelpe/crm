import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M9 11l3 3l8 -8", key: "checkbox-1" }],
  [
    "path",
    {
      d: "M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9",
      key: "checkbox-2",
    },
  ],
] as const;

const Checkbox = createIcon("checkbox", iconNode);

export default Checkbox;
