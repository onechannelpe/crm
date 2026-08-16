import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M5 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0", key: "users-1" }],
  ["path", { d: "M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2", key: "users-2" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "users-3" }],
  ["path", { d: "M21 21v-2a4 4 0 0 0 -3 -3.85", key: "users-4" }],
] as const;

const Users = createIcon("users", iconNode);

export default Users;
