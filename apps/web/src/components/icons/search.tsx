import { createIcon } from "./create-icon";

const iconNode = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
] as const;

const Search = createIcon("search", iconNode);

export default Search;
