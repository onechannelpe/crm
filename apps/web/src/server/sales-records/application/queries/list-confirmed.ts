import type { AppContext } from "~/server/shared/action-runtime";

import type { SalesRecordReadContext } from "../../infrastructure/read-context";
import type { SalesRecordQueueItemView } from "./views/sales-record-view";

function mapQueueItem(
  row: Awaited<
    ReturnType<
      SalesRecordReadContext["repos"]["salesRecords"]["listConfirmedWithClient"]
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

export async function listConfirmed(
  ctx: AppContext,
  deps: SalesRecordReadContext,
): Promise<SalesRecordQueueItemView[]> {
  const scope =
    ctx.actor.role === "executive"
      ? { executiveUserId: ctx.actor.userId }
      : ctx.actor.role === "superuser"
        ? undefined
        : { branchId: ctx.actor.branchId };
  const rows = await deps.repos.salesRecords.listConfirmedWithClient(scope);
  return rows.map(mapQueueItem);
}
