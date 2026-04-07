import { createIcon } from "./create-icon";

const iconNode = [
  [
    "rect",
    {
      x: "3",
      y: "3",
      width: "18",
      height: "18",
      rx: "3",
      key: "brand-linkedin-1",
    },
  ],
  ["path", { d: "M8 10v6", key: "brand-linkedin-2" }],
  ["circle", { cx: "8", cy: "7", r: "1", key: "brand-linkedin-3" }],
  ["path", { d: "M12 16v-3a2 2 0 0 1 4 0v3", key: "brand-linkedin-4" }],
] as const;

const BrandLinkedin = createIcon("brand-linkedin", iconNode);

export default BrandLinkedin;
