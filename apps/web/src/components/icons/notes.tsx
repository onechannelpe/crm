import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z",
      key: "notes-outline",
    },
  ],
  [
    "path",
    {
      d: "M9 7h6",
      key: "notes-line-1",
    },
  ],
  [
    "path",
    {
      d: "M9 11h6",
      key: "notes-line-2",
    },
  ],
  [
    "path",
    {
      d: "M9 15h4",
      key: "notes-line-3",
    },
  ],
] as const;

const Notes = createIcon("notes", iconNode);

export default Notes;
