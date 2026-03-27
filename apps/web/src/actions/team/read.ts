"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { runAction } from "~/server/shared/action-runtime";
import {
  getBulkImportSetup as getBulkImportSetupService,
  getInviteManagement as getInviteManagementService,
} from "~/server/team/service-invites";
import type { BulkImportSetup, InviteManagement } from "~/server/team/types";

export async function getInviteManagement(): Promise<InviteManagement> {
  const session = await requirePermission("hr:manage");
  return runAction({
    actionName: "team.invite_management.read",
    actor: session,
    execute: getInviteManagementService,
  });
}

export async function getBulkImportSetup(): Promise<BulkImportSetup> {
  const session = await requirePermission("admin:manage");
  return runAction({
    actionName: "team.bulk_import_setup.read",
    actor: session,
    execute: getBulkImportSetupService,
  });
}
