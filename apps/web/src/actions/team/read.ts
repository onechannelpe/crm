"use server";

import type { BulkImportSetup, InviteManagement } from "~/contracts/team";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import {
  getBulkImportSetup as getBulkImportSetupService,
  getInviteManagement as getInviteManagementService,
} from "~/server/team/application/invites";
import { isErr, Ok } from "~/shared/result";

export async function getInviteManagement(): Promise<
  InviteManagement & { evaluatedAt: number }
> {
  return runAction({
    name: "team.invite_management.read",
    access: { kind: "permission", permission: "hr:manage" },
    execute: async (ctx) => {
      const management = await getInviteManagementService(
        ctx,
        getServerRuntime().team.inviteManagement,
        getServerRuntime().team.publicOrigin,
      );
      if (isErr(management)) return management;

      return Ok({
        ...management.value,
        evaluatedAt: ctx.now().getTime(),
      });
    },
  });
}

export async function getBulkImportSetup(): Promise<BulkImportSetup> {
  return runAction({
    name: "team.bulk_import_setup.read",
    access: { kind: "permission", permission: "admin:manage" },
    execute: getBulkImportSetupService,
  });
}
