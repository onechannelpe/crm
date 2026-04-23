import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M19.5 12.572 12 20l-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.572",
      key: "17s6cp",
    },
  ],
] as const;

const Heart = createIcon("heart", iconNode);

export default Heart;
