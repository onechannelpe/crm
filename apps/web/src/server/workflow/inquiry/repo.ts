import type {
  InquiryState,
  LeadPriority,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type {
  IntegrationJobId,
  UserId,
  WorkflowInquiryId,
  WorkflowLeadId,
} from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

export type InquiryRow = {
  id: WorkflowInquiryId;
  ruc: string;
  executiveId: UserId;
  state: InquiryState;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  answeredAt: Date | null;
  answeredBy: UserId | null;
  convertedLeadId: WorkflowLeadId | null;
  createdAt: Date;
};

type InquiryDbRow = {
  id: WorkflowInquiryId;
  ruc: string;
  executive_id: UserId;
  state: InquiryState;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  answered_at: Date | null;
  answered_by: UserId | null;
  converted_lead_id: WorkflowLeadId | null;
  created_at: Date;
};

function toInquiry(row: InquiryDbRow): InquiryRow {
  return {
    id: row.id,
    ruc: row.ruc,
    executiveId: row.executive_id,
    state: row.state,
    status: row.status,
    priority: row.priority,
    answeredAt: row.answered_at,
    answeredBy: row.answered_by,
    convertedLeadId: row.converted_lead_id,
    createdAt: row.created_at,
  };
}

const INQUIRY_COLUMNS = [
  "id",
  "ruc",
  "executive_id",
  "state",
  "status",
  "priority",
  "answered_at",
  "answered_by",
  "converted_lead_id",
  "created_at",
] as const;

export function createInquiryRepo(db: DatabaseExecutor) {
  return {
    // Returns undefined when the executive already has a live (non-converted)
    // inquiry for the RUC: the partial unique index absorbs the race and the
    // caller maps the miss to a duplicate error.
    async insert(values: {
      ruc: string;
      executiveId: UserId;
      createdAt: Date;
    }): Promise<{ id: WorkflowInquiryId } | undefined> {
      const row = await db
        .insertInto("workflow_inquiries")
        .values({
          ruc: values.ruc,
          executive_id: values.executiveId,
          state: "PENDING",
          created_at: values.createdAt,
          updated_at: values.createdAt,
        })
        .onConflict((oc) =>
          oc
            .columns(["executive_id", "ruc"])
            .where("state", "!=", "CONVERTED")
            .doNothing(),
        )
        .returning("id")
        .executeTakeFirst();

      return row;
    },

    async findById(id: WorkflowInquiryId): Promise<InquiryRow | undefined> {
      const row = await db
        .selectFrom("workflow_inquiries")
        .select(INQUIRY_COLUMNS)
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? toInquiry(row) : undefined;
    },

    async findLiveForExecutive(
      ruc: string,
      executiveId: UserId,
    ): Promise<InquiryRow | undefined> {
      const row = await db
        .selectFrom("workflow_inquiries")
        .select(INQUIRY_COLUMNS)
        .where("ruc", "=", ruc)
        .where("executive_id", "=", executiveId)
        .where("state", "!=", "CONVERTED")
        .executeTakeFirst();
      return row ? toInquiry(row) : undefined;
    },

    async markConverted(
      id: WorkflowInquiryId,
      leadId: WorkflowLeadId,
      convertedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("workflow_inquiries")
        .set({
          state: "CONVERTED",
          converted_lead_id: leadId,
          updated_at: convertedAt,
        })
        .where("id", "=", id)
        .execute();
    },

    // Stamps every live inquiry for the RUC with whichever answer field the
    // import row carries. An inquiry counts as answered once it has a status;
    // a priority-only stamp fills the field but keeps the inquiry pending.
    // Returns the rows that transitioned to ANSWERED on this stamp so the
    // caller can notify their executives exactly once.
    async stampAnswer(input: {
      ruc: string;
      status?: LeadStatus;
      priority?: LeadPriority;
      answeredBy: UserId;
      answeredByJobId: IntegrationJobId;
      answeredAt: Date;
    }): Promise<{ stamped: number; newlyAnswered: InquiryRow[] }> {
      const live = await db
        .selectFrom("workflow_inquiries")
        .select(INQUIRY_COLUMNS)
        .where("ruc", "=", input.ruc)
        .where("state", "!=", "CONVERTED")
        .execute();

      const newlyAnswered: InquiryRow[] = [];

      for (const row of live) {
        const status = input.status ?? row.status;
        const priority = input.priority ?? row.priority;
        const answered = status !== null;

        // eslint-disable-next-line no-await-in-loop
        await db
          .updateTable("workflow_inquiries")
          .set({
            status,
            priority,
            state: answered ? "ANSWERED" : "PENDING",
            answered_at: answered
              ? (row.answered_at ?? input.answeredAt)
              : null,
            answered_by: input.answeredBy,
            answered_by_job_id: input.answeredByJobId,
            updated_at: input.answeredAt,
          })
          .where("id", "=", row.id)
          .execute();

        if (answered && row.state === "PENDING") {
          newlyAnswered.push(
            toInquiry({
              ...row,
              status,
              priority,
              state: "ANSWERED",
              answered_at: row.answered_at ?? input.answeredAt,
              answered_by: input.answeredBy,
            }),
          );
        }
      }

      return { stamped: live.length, newlyAnswered };
    },
  };
}
