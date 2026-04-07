import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M21 11.5 12.5 20a5 5 0 1 1-7.07-7.07l8.5-8.5a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 1 1-2.83-2.83l7.78-7.78",
      key: "paperclip",
    },
  ],
] as const;

const Paperclip = createIcon("paperclip", iconNode);

export default Paperclip;
