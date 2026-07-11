export function isTwoFirstDepths({
  depth,
}: {
  keyPath: string;
  depth: number;
}) {
  return depth <= 1;
}
