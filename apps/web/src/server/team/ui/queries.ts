import "server-only";
import type { BulkImportSetup, InviteManagement } from "~/contracts/team";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  getBulkImportSetup as getBulkImportSetupService,
  getInviteManagement as getInviteManagementService,
} from "~/server/team/application/invites";
import { composeTeam } from "~/server/team/ui/composition";
import { isErr, Ok } from "~/shared/result";

export async function getInviteManagement(): Promise<
  InviteManagement & { evaluatedAt: number }
> {
  return executeSessionServerFunction({
    name: "team.invite_management.read",
    access: { kind: "permission", permission: "hr:manage" },
    execute: async (ctx) => {
      const management = await getInviteManagementService(
        ctx,
        composeTeam().inviteManagement,
        composeTeam().publicOrigin,
      );
      if (isErr(management)) return management;

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
