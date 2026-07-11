"use server";

import type { BulkImportSetup, InviteManagement } from "~/contracts/team";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import {
  getBulkImportSetup as getBulkImportSetupService,
  getInviteManagement as getInviteManagementService,
} from "~/server/team/application/invites";

export async function getInviteManagement(): Promise<InviteManagement> {
  return runAction({
    name: "team.invite_management.read",
    access: { kind: "permission", permission: "hr:manage" },
    execute: (ctx) =>
      getInviteManagementService(ctx, getServerRuntime().team.inviteManagement),
  });
}

export async function getBulkImportSetup(): Promise<BulkImportSetup> {
  return runAction({
    name: "team.bulk_import_setup.read",
    access: { kind: "permission", permission: "admin:manage" },
    execute: getBulkImportSetupService,
  });
}
