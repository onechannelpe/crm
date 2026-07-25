import type {
  InquiryState,
  LeadPriority,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { UserId, WorkflowInquiryId, WorkflowLeadId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { resolveReviewTransition } from "~/server/workflow/lead/domain/review";
import type { RecordExportFilters } from "~/server/workflow/lead/read/lead-queries";

export type InquiryListRow = {
  id: WorkflowInquiryId;
  ruc: string;
  legalName: string | null;
  state: InquiryState;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  createdAt: number;
  answeredAt: number | null;
  convertedLeadId: WorkflowLeadId | null;
  // An answered inquiry is worth registering only when its status would clear
  // review; CARTERIZADO/STOCK answers would just birth a disqualified lead.
  registrable: boolean;
};

export type InquiryExportRow = {
  ruc: string;
  legalName: string | null;
  executiveId: UserId;
  executiveName: string;
  createdAt: number;
};

export async function listInquiriesForExecutive(
  db: DatabaseExecutor,
  executiveId: UserId,
): Promise<InquiryListRow[]> {
  const rows = await db
    .selectFrom("workflow_inquiries as inquiry")
    .leftJoin("organizations as org", "org.ruc", "inquiry.ruc")
    .select([
      "inquiry.id",
      "inquiry.ruc",
      "org.legal_name",
      "inquiry.state",
      "inquiry.status",
      "inquiry.priority",
      "inquiry.created_at",
      "inquiry.answered_at",
      "inquiry.converted_lead_id",
    ])
    .where("inquiry.executive_id", "=", executiveId)
    .orderBy("inquiry.created_at", "desc")
    .execute();

  return rows.map((row) => ({
    id: row.id,
    ruc: row.ruc,
    legalName: row.legal_name,
    state: row.state,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at.getTime(),
    answeredAt: row.answered_at?.getTime() ?? null,
    convertedLeadId: row.converted_lead_id,
    registrable:
      row.state === "ANSWERED" &&
      row.status !== null &&
      resolveReviewTransition(row.status) === "PRICING",
  }));
}

// Pending inquiries ride the same back-office export as leads awaiting
// review, so the external availability lookup covers them in the same pass.
// The role scoping mirrors applyLeadVisibility (lead-list-filters.ts): the
// export must include exactly the population whose leads the actor sees.
export async function exportPendingInquiries(
  db: DatabaseExecutor,
  filters: RecordExportFilters,
): Promise<InquiryExportRow[]> {
  let q = db
    .selectFrom("workflow_inquiries as inquiry")
    .innerJoin("users as executive", "executive.id", "inquiry.executive_id")
    .leftJoin("organizations as org", "org.ruc", "inquiry.ruc")
    .select([
      "inquiry.ruc",
      "org.legal_name",
      "inquiry.executive_id",
      "executive.names as executive_names",
      "executive.first_surname as executive_first_surname",
      "inquiry.created_at",
    ])
    .where("inquiry.state", "=", "PENDING");

  if (filters.actorRole === "supervisor") {
    q = q.where("executive.branch_id", "in", (eb) =>
      eb
        .selectFrom("branch_supervisors")
        .select("branch_id")
        .where("user_id", "=", filters.actorUserId),
    );
  } else if (filters.actorRole === "back_office") {
    q = q.where("executive.team_id", "in", (eb) =>
      eb
        .selectFrom("back_office_assignments")
        .select("team_id")
        .where("back_office_user_id", "=", filters.actorUserId),
    );
  } else if (filters.actorRole === "executive") {
    q = q.where("inquiry.executive_id", "=", filters.actorUserId);
  } else if (filters.actorRole !== "superuser") {
    q = q.where("executive.branch_id", "=", filters.actorBranchId);
  }

  const rows = await q.orderBy("inquiry.created_at", "asc").execute();

  return rows.map((row) => ({
    ruc: row.ruc,
    legalName: row.legal_name,
    executiveId: row.executive_id,
    executiveName: `${row.executive_names} ${row.executive_first_surname}`,
    createdAt: row.created_at.getTime(),
  }));
}
