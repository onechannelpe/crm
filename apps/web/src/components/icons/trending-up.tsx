import { createIcon } from "./create-icon";

const iconNode = [
  [
    "polyline",
    { points: "22 7 13.5 15.5 8.5 10.5 2 17", key: "trending-up-a" },
  ],
  ["polyline", { points: "16 7 22 7 22 13", key: "trending-up-b" }],
] as const;

const TrendingUp = createIcon("trending-up", iconNode);

export default TrendingUp;
