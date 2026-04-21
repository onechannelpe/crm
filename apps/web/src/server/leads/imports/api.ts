import type { Role } from "~/lib/auth/access/rbac";
import type {
  IntegrationJobRow,
  IntegrationRuntime,
} from "~/server/integrations/types";

import { parsePriorityImport } from "./priority-parser";
import { parseStatusImport } from "./status-parser";
import {
  detectLeadImportTypeFromCsv,
  type LeadImportType,
  type LeadImportTypeDetectionErrorCode,
} from "./type-detection";

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
      rowsTotal: number;
    }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode | "invalid_file";
      message: string;
    } {
  const detection = detectLeadImportTypeFromCsv(input.fileText);
  if (!detection.ok) {
    return {
      ok: false,
      code: detection.code,
      message: detection.message,
    };
  }

  try {
    const parsed =
      detection.type === "import_status"
        ? parseStatusImport(input.fileText)
        : parsePriorityImport(input.fileText);
    return {
      ok: true,
      importType: detection.type,
      rowsTotal: parsed.valid.length + parsed.invalid.length,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      code: "invalid_file",
      message: error instanceof Error ? error.message : "Invalid CSV file",
    };
  }
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
