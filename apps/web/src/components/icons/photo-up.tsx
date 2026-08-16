import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M15 8h.01", key: "photo-up-1" }],
  [
    "path",
    {
      d: "M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5",
      key: "photo-up-2",
    },
  ],
  [
    "path",
    {
      d: "M3 16l5 -5c.928 -.893 2.072 -.893 3 0l3.5 3.5",
      key: "photo-up-3",
    },
  ],
  [
    "path",
    { d: "M14 14l1 -1c.679 -.653 1.473 -.829 2.214 -.526", key: "photo-up-4" },
  ],
  ["path", { d: "M19 22v-6", key: "photo-up-5" }],
  ["path", { d: "M22 19l-3 -3l-3 3", key: "photo-up-6" }],
] as const;

const PhotoUp = createIcon("photo-up", iconNode);

export default PhotoUp;
