import { createIcon } from "./create-icon";

const iconNode = [
  [
    "polyline",
    { points: "22 17 13.5 8.5 8.5 13.5 2 7", key: "trending-down-a" },
  ],
  ["polyline", { points: "16 17 22 17 22 11", key: "trending-down-b" }],
] as const;

const TrendingDown = createIcon("trending-down", iconNode);

export default TrendingDown;
