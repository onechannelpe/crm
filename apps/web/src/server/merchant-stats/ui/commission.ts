import type { CommissionManagerView } from "~/contracts/merchant-stats/commission-views";
import type { CommissionSchemeRules } from "~/domain/merchant-stats/commission";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { Ok } from "~/shared/result";

export async function getCommissionManagerDashboard(): Promise<CommissionManagerView> {
  return executeSessionServerFunction({
    name: "merchantStats.commission.managerView.read",
    access: { kind: "permission", permission: "commission:read" },

    execute: async (ctx) =>
      Ok(await getApplication().merchantStats.commission.managerView(ctx)),
  });
}

export async function getCommissionSchemeDraft(): Promise<CommissionSchemeRules> {
  return executeSessionServerFunction({
    name: "merchantStats.commission.scheme.read",
    access: { kind: "permission", permission: "commission:manage" },

    execute: async (ctx) =>
      Ok(await getApplication().merchantStats.commission.getScheme(ctx)),
  });
}
