import { createIcon } from "./create-icon";

const iconNode = [
  ["circle", { cx: "12", cy: "12", r: "4", key: "sun-core" }],
  ["path", { d: "M12 2v2", key: "sun-n" }],
  ["path", { d: "M12 20v2", key: "sun-s" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "sun-nw" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "sun-se" }],
  ["path", { d: "M2 12h2", key: "sun-w" }],
  ["path", { d: "M20 12h2", key: "sun-e" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "sun-sw" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "sun-ne" }],
] as const;

const Sun = createIcon("sun", iconNode);

export default Sun;
