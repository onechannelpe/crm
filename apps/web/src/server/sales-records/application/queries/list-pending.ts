import type { AppContext } from "~/server/shared/action-runtime";

import type { SalesRecordReadContext } from "../../infrastructure/read-context";
import type { SalesRecordQueueItemView } from "./views/sales-record-view";

function mapQueueItem(
  row: Awaited<
    ReturnType<
      SalesRecordReadContext["repos"]["salesRecords"]["listPendingWithClient"]
    >
  >[number],
): SalesRecordQueueItemView {
  return {
    id: row.id,
    status: row.status,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactDni: row.dni,
    executiveName: row.executive_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPending(
  ctx: AppContext,
  deps: SalesRecordReadContext,
): Promise<SalesRecordQueueItemView[]> {
  const rows = await deps.repos.salesRecords.listPendingWithClient(
    ctx.actor.role === "superuser"
      ? undefined
      : { branchId: ctx.actor.branchId },
  );
  return rows.map(mapQueueItem);
}
