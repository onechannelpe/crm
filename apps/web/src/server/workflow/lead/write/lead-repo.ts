import type { Insertable } from "kysely";

import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import { hydrateRuc } from "~/domain/identity/document";
import type {
  BranchId,
  OrganizationId,
  UserId,
  WorkflowLeadId,
} from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";
import type {
  LeadCommercialScope,
  LeadDraft,
  LeadState,
} from "~/server/workflow/lead/domain/state";

export type LeadRepository = {
  insert(values: LeadDraft): Promise<WorkflowLeadId>;
  findById(id: WorkflowLeadId): Promise<LeadState | undefined>;
  findByIdIncludingDeleted(id: WorkflowLeadId): Promise<LeadState | undefined>;
  findCommercialScope(
    leadId: WorkflowLeadId,
  ): Promise<LeadCommercialScope | undefined>;
  findActiveByRuc(ruc: string): Promise<LeadState | undefined>;
  findByRucMany(rucs: string[]): Promise<LeadState[]>;
  countPendingQuotationDecisions(
    executiveId: UserId,
    activeAsOf: Date,
  ): Promise<number>;
  updateCommercialSnapshot(
    leadId: WorkflowLeadId,
    scope: LeadCommercialScope,
    updatedAt: Date,
    updatedBy: UserId,
  ): Promise<unknown>;
};

type LeadRow = {
  id: WorkflowLeadId;
  organization_id: OrganizationId;
  executive_id: UserId;
  branch_id: BranchId;
  created_by: UserId;
  updated_by: UserId | null;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  created_at: Date;
  updated_at: Date;
};

type LeadWithOrganizationRow = LeadRow & {
  ruc: string;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  deleted_at: Date | null;
  reservation_expires_at: Date | null;
  version: number;
};
type NewLeadRow = Insertable<Database["workflow_leads"]>;

function toLead(row: LeadWithOrganizationRow): LeadState {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ruc: hydrateRuc(row.ruc),
    legalName: row.legal_name,
    address: row.address,
    district: row.district,
    department: row.department,
    executiveId: row.executive_id,
    branchId: row.branch_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by ?? null,
    stage: row.stage,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    reservationExpiresAt: row.reservation_expires_at,
    version: row.version,
  };
}

function toCommercialColumns(scope: LeadCommercialScope) {
  return {
    current_provider: scope.currentProvider,
    current_debit_rate: scope.currentDebitRate,
    current_credit_rate: scope.currentCreditRate,
    gpv: scope.gpv,
    ticket: scope.ticket,
    settlement_bank: scope.settlementBank,
    pos_count: scope.posCount,
  };
}

function toNewLeadRow(values: LeadDraft): NewLeadRow {
  return {
    organization_id: values.organizationId,
    created_by: values.createdBy,
    updated_by: values.updatedBy ?? undefined,
    stage: values.stage,
    status: values.status,
    priority: values.priority,
    created_at: values.createdAt,
    updated_at: values.updatedAt,
    reservation_expires_at: values.reservationExpiresAt,
    ...toCommercialColumns(values),
  };
}

export function createLeadRepo(db: DatabaseExecutor) {
  const selectLeadWithOrganization = db
    .selectFrom("workflow_leads as lead")
    .innerJoin("organizations as org", "org.id", "lead.organization_id")
    .innerJoin(
      "organization_current_owners as owner",
      "owner.organization_id",
      "lead.organization_id",
    )
    .innerJoin("users as executive", "executive.id", "owner.executive_id")
    .select([
      "lead.id",
      "lead.organization_id",
      "owner.executive_id",
      "executive.branch_id",
      "lead.created_by",
      "lead.updated_by",
      "lead.stage",
      "lead.status",
      "lead.priority",
      "lead.created_at",
      "lead.updated_at",
      "lead.deleted_at",
      "lead.reservation_expires_at",
      "lead.version",
      "org.ruc",
      "org.legal_name",
      "org.address",
      "org.district",
      "org.department",
    ]);

  return {
    async insert(values: LeadDraft): Promise<WorkflowLeadId> {
      const row = await db
        .insertInto("workflow_leads")
        .values(toNewLeadRow(values))
        .returning("id")
        .executeTakeFirstOrThrow();

      return row.id;
    },

    async findById(id: WorkflowLeadId) {
      const row = await selectLeadWithOrganization
        .where("lead.id", "=", id)
        .where("lead.deleted_at", "is", null)
        .executeTakeFirst();
      return row ? toLead(row) : undefined;
    },

    async findByIdIncludingDeleted(id: WorkflowLeadId) {
      const row = await selectLeadWithOrganization
        .where("lead.id", "=", id)
        .executeTakeFirst();
      return row ? toLead(row) : undefined;
    },

    async findCommercialScope(
      leadId: WorkflowLeadId,
    ): Promise<LeadCommercialScope | undefined> {
      const row = await db
        .selectFrom("workflow_leads")
        .select([
          "current_provider",
          "current_debit_rate",
          "current_credit_rate",
          "gpv",
          "ticket",
          "settlement_bank",
          "pos_count",
        ])
        .where("id", "=", leadId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      if (!row) {
        return undefined;
      }
      return {
        currentProvider: row.current_provider,
        currentDebitRate: row.current_debit_rate,
        currentCreditRate: row.current_credit_rate,
        gpv: row.gpv,
        ticket: row.ticket,
        settlementBank: row.settlement_bank,
        posCount: row.pos_count,
      };
    },

    async findActiveByRuc(ruc: string) {
      const row = await selectLeadWithOrganization
        .where("org.ruc", "=", ruc)
        .where("lead.deleted_at", "is", null)
        .where("lead.stage", "!=", "EXPIRED")
        .executeTakeFirst();
      return row ? toLead(row) : undefined;
    },

    async findByRucMany(rucs: string[]): Promise<LeadState[]> {
      if (rucs.length === 0) {
        return [];
      }
      const rows = await selectLeadWithOrganization
        .where("org.ruc", "in", rucs)
        .execute();
      return rows.map((row) => toLead(row as LeadWithOrganizationRow));
    },

    // One row per PRICING lead with a pending proposal (at most one proposal
    // per lead is ever pending). accept-rate, request-rate-revision, and
    // close-lead each move the proposal off "pending" or the lead off PRICING.
    async countPendingQuotationDecisions(
      executiveId: UserId,
      activeAsOf: Date,
    ): Promise<number> {
      const row = await db
        .selectFrom("workflow_leads as lead")
        .innerJoin(
          "organization_current_owners as owner",
          "owner.organization_id",
          "lead.organization_id",
        )
        .innerJoin("workflow_rate_proposals as proposal", (join) =>
          join
            .onRef("proposal.lead_id", "=", "lead.id")
            .on("proposal.outcome", "=", "pending"),
        )
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("owner.executive_id", "=", executiveId)
        .where("lead.stage", "=", "PRICING")
        .where("lead.deleted_at", "is", null)
        .where("lead.reservation_expires_at", "is not", null)
        .where("lead.reservation_expires_at", ">", activeAsOf)
        .executeTakeFirst();

      return row?.count ?? 0;
    },

    async findLapsedReservations(lapsedAsOf: Date): Promise<WorkflowLeadId[]> {
      const rows = await db
        .selectFrom("workflow_leads")
        .select("id")
        .where("reservation_expires_at", "is not", null)
        .where("reservation_expires_at", "<=", lapsedAsOf)
        .where("deleted_at", "is", null)
        .where("stage", "=", "PRICING")
        .execute();
      return rows.map((row) => row.id);
    },

    updateCommercialSnapshot(
      leadId: WorkflowLeadId,
      scope: LeadCommercialScope,
      updatedAt: Date,
      updatedBy: UserId,
    ) {
      return db
        .updateTable("workflow_leads")
        .set({
          ...toCommercialColumns(scope),
          updated_at: updatedAt,
          updated_by: updatedBy,
        })
        .where("id", "=", leadId)
        .execute();
    },
  };
}
