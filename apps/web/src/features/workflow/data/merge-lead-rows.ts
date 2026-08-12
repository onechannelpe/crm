import { type LeadListRowView } from "~/contracts/workflow/views";

export function mergeLeadRows(
  serverRows: readonly LeadListRowView[],
  optimisticRows: readonly LeadListRowView[],
): readonly LeadListRowView[] {
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
