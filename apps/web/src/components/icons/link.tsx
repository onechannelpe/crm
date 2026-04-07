import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7.1 7.1L17 13",
      key: "link-1",
    },
  ],
  [
    "path",
    {
      d: "M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 1 1-7.1-7.1L7 11",
      key: "link-2",
    },
  ],
  ["path", { d: "m8.5 15.5 7-7", key: "link-3" }],
] as const;

const Link = createIcon("link", iconNode);

export default Link;
