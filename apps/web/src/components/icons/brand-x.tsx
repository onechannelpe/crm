import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M4 4l16 16", key: "brand-x-1" }],
  ["path", { d: "M20 4 4 20", key: "brand-x-2" }],
] as const;

const BrandX = createIcon("brand-x", iconNode);

export default BrandX;
