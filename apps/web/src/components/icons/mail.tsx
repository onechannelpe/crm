import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z",
      key: "mail-1",
    },
  ],
  ["path", { d: "M3 7l9 6l9 -6", key: "mail-2" }],
] as const;

const Mail = createIcon("mail", iconNode);

export default Mail;
