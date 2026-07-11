import { createIcon } from "./create-icon";

const iconNode = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "1" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "2" }],
] as const;

const Pause = createIcon("pause", iconNode);

export default Pause;
