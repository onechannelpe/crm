import {
  type LeadPriority,
  type LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { InquiryRow } from "~/server/workflow/inquiry/repo";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

export type RowResult =
  | { row: number; ok: false; reason: string }
  | { row: number; ok: true };

export type ImportRowInput =
  | {
      row: number;
      ruc: string;
      type: "import_status";
      status: LeadStatus;
    }
  | {
      row: number;
      ruc: string;
      type: "import_prioridad";
      priority: LeadPriority;
    };

export type LeadMutationResult = (
  | {
      ok: false;
      rowResult: RowResult;
    }
  | {
      ok: true;
      rowResult: RowResult;
      committed: CommittedLeadEvent[];
    }
) & {
  // Inquiries stamped by this row regardless of the lead outcome; the ones
  // that newly became answered drive the executive notifications.
  newlyAnsweredInquiries: InquiryRow[];
};
