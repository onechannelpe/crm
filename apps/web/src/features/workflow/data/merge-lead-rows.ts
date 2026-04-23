import type { LeadListRowView } from "~/server/workflow/application/queries/views/lead-list";

import type { OptimisticLeadRow } from "./optimistic-leads";

export function mergeLeadRows(
  serverRows: LeadListRowView[],
  optimisticRows: OptimisticLeadRow[],
): LeadListRowView[] {
  if (optimisticRows.length === 0) {
    return serverRows;
  }

  const serverRucSet = new Set(serverRows.map((row) => row.ruc));
  const pendingRows = optimisticRows.filter(
    (row) => !serverRucSet.has(row.ruc),
  );

  if (pendingRows.length === 0) {
    return serverRows;
  }

  return [...pendingRows, ...serverRows];
}
