"use server";

import { runAction } from "~/server/shared/action-runtime";
import {
  getBulkImportSetup as getBulkImportSetupService,
  getInviteManagement as getInviteManagementService,
} from "~/server/team/service";
import type { BulkImportSetup, InviteManagement } from "~/server/team/types";

export async function getInviteManagement(): Promise<InviteManagement> {
  return runAction({
    actionName: "team.invite_management.read",
    permission: "hr:manage",
    execute: (ctx) => getInviteManagementService(ctx),
  });
}

export async function getBulkImportSetup(): Promise<BulkImportSetup> {
  return runAction({
    actionName: "team.bulk_import_setup.read",
    permission: "admin:manage",
    execute: getBulkImportSetupService,
  });
}
