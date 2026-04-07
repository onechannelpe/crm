import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M5 12l-2 0l9 -9l9 9l-2 0", key: "home-tabler-1" }],
  [
    "path",
    {
      d: "M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7",
      key: "home-tabler-2",
    },
  ],
  [
    "path",
    {
      d: "M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6",
      key: "home-tabler-3",
    },
  ],
] as const;

const HomeTabler = createIcon("home-tabler", iconNode);

export default HomeTabler;
