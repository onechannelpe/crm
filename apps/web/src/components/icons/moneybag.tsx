import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M9.5 3h5a1.5 1.5 0 0 1 1.5 1.5 3.5 3.5 0 0 1-3.5 3.5h-1A3.5 3.5 0 0 1 8 4.5 1.5 1.5 0 0 1 9.5 3",
      key: "moneybag-1",
    },
  ],
  [
    "path",
    {
      d: "M4 17v-1a8 8 0 1 1 16 0v1a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4",
      key: "moneybag-2",
    },
  ],
] as const;

const MoneyBag = createIcon("moneybag", iconNode);

export default MoneyBag;
