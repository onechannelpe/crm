"use server";

import { runAction } from "~/server/shared/action-runtime";
import { createTeamInviteRuntime } from "~/server/team/runtime";
import {
  getBulkImportSetup as getBulkImportSetupService,
  getInviteManagement as getInviteManagementService,
} from "~/server/team/service-invites";
import type { BulkImportSetup, InviteManagement } from "~/server/team/types";

export async function getInviteManagement(): Promise<InviteManagement> {
  const runtime = createTeamInviteRuntime();
  return runAction({
    actionName: "team.invite_management.read",
    permission: "hr:manage",
    execute: (ctx) =>
      getInviteManagementService(ctx, {
        repos: runtime.repos,
        provisioning: runtime.provisioning,
      }),
  });
}

export async function getBulkImportSetup(): Promise<BulkImportSetup> {
  return runAction({
    actionName: "team.bulk_import_setup.read",
    permission: "admin:manage",
    execute: getBulkImportSetupService,
  });
}
