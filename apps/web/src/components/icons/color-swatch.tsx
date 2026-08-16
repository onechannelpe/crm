import { createIcon } from "./create-icon";

const iconNode = [
  [
    "path",
    {
      d: "M19 3h-4a2 2 0 0 0 -2 2v12a4 4 0 0 0 8 0v-12a2 2 0 0 0 -2 -2",
      key: "color-swatch-1",
    },
  ],
  [
    "path",
    {
      d: "M13 7.35l-2 -2a2 2 0 0 0 -2.828 0l-2.828 2.828a2 2 0 0 0 0 2.828l9 9",
      key: "color-swatch-2",
    },
  ],
  [
    "path",
    {
      d: "M7.3 13h-2.3a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h12",
      key: "color-swatch-3",
    },
  ],
  ["path", { d: "M17 17l0 .01", key: "color-swatch-4" }],
] as const;

const ColorSwatch = createIcon("color-swatch", iconNode);

export default ColorSwatch;
