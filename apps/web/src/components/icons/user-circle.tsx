import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", key: "user-circle-1" }],
  ["path", { d: "M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", key: "user-circle-2" }],
  [
    "path",
    {
      d: "M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855",
      key: "user-circle-3",
    },
  ],
] as const;

const UserCircle = createIcon("user-circle", iconNode);

export default UserCircle;
