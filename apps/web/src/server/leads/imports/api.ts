import type { LeadImportType } from "~/features/leads-imports/contracts";
import type { Role } from "~/lib/auth/access/rbac";
import type {
  IntegrationJobRow,
  IntegrationRuntime,
} from "~/server/integrations/types";

import {
  inspectLeadImportCsv,
  type LeadImportTypeDetectionErrorCode,
} from "./intake";

interface ActorScope {
  userId: number;
  branchId: number;
  role: Role;
}

function canBypassBranchScope(role: Role): boolean {
  return role === "admin" || role === "superuser";
}

export function detectLeadImportFile(input: { fileText: string }):
  | {
      ok: true;
      importType: LeadImportType;
    }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode;
      message: string;
    } {
  const inspection = inspectLeadImportCsv(input.fileText);
  if (!inspection.ok) {
    return {
      ok: false,
      code: inspection.code,
      message: inspection.message,
    };
  }

  return {
    ok: true,
    importType: inspection.importType,
  };
}

export async function canAccessLeadImportJob(
  actor: ActorScope,
  job: IntegrationJobRow,
  runtime: IntegrationRuntime,
): Promise<boolean> {
  if (canBypassBranchScope(actor.role)) {
    return true;
  }

  if (job.requested_by_user_id === actor.userId) {
    return true;
  }

  const requester = await runtime.users.findById(job.requested_by_user_id);
  if (!requester) {
    return false;
  }

  return requester.branch_id === actor.branchId;
}
