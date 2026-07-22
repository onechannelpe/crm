import type { SourceRow } from "../intake/types";

export function batchByRuc(
  rows: readonly SourceRow[],
  targetSize: number,
): SourceRow[][] {
  const byRuc = new Map<string, SourceRow[]>();

  for (const row of rows) {
    const group = byRuc.get(row.ruc);

    if (group) {
      group.push(row);
      continue;
    }

    byRuc.set(row.ruc, [row]);
  }

  const batches: SourceRow[][] = [];
  let current: SourceRow[] = [];

  for (const group of byRuc.values()) {
    if (current.length > 0 && current.length + group.length > targetSize) {
      batches.push(current);
      current = [];
    }

    current.push(...group);
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}
