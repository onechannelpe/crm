import type { BulkImportSetup, InviteManagement } from "~/contracts/team";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { getBulkImportSetup as getBulkImportSetupService } from "~/server/team/application/invites";
import { isErr, Ok } from "~/shared/result";

export async function getInviteManagement(): Promise<
  InviteManagement & { evaluatedAt: number }
> {
  return executeSessionServerFunction({
    name: "team.invite_management.read",
    access: { kind: "permission", permission: "team:invite" },
    execute: async (ctx) => {
      const management = await getApplication().team.management.get(ctx);
      if (isErr(management)) {
        return management;
      }

      return Ok({
        ...management.value,
        evaluatedAt: ctx.operationAt.getTime(),
      });
    },
  });
}

export async function getBulkImportSetup(): Promise<BulkImportSetup> {
  return executeSessionServerFunction({
    name: "team.bulk_import_setup.read",
    access: { kind: "permission", permission: "admin:manage" },
    execute: getBulkImportSetupService,
  });
}
