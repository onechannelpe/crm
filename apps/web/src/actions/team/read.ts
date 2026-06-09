"use server";

import type {
  BulkImportSetup,
  InviteManagement,
} from "~/actions/team/contracts";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
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
