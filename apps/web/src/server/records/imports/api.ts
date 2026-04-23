import type { RecordImportType } from "~/features/records-imports/contracts";
import type { Role } from "~/lib/auth/access/rbac";
import type {
  IntegrationJobRow,
  IntegrationRuntime,
} from "~/server/integrations/types";

import {
  inspectRecordImportCsv,
  type RecordImportTypeDetectionErrorCode,
} from "./intake";

interface ActorScope {
  userId: number;
  branchId: number;
  role: Role;
}

function canBypassBranchScope(role: Role): boolean {
  return role === "admin" || role === "superuser";
}

export function detectRecordImportFile(input: { fileText: string }):
  | {
      ok: true;
      importType: RecordImportType;
    }
  | {
      ok: false;
      code: RecordImportTypeDetectionErrorCode;
      message: string;
    } {
  const inspection = inspectRecordImportCsv(input.fileText);
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

export async function canAccessRecordImportJob(
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
