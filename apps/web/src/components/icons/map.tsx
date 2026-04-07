import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3", key: "map-1" }],
  ["path", { d: "M9 3v15", key: "map-2" }],
  ["path", { d: "M15 6v15", key: "map-3" }],
] as const;

const Map = createIcon("map", iconNode);

export default Map;
