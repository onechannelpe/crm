import { randomUUIDv7 } from "bun";
import type { Insertable } from "kysely";

import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { OrganizationId } from "~/server/shared/ids";
import type {
  LeadCommercialScope,
  LeadDraft,
  LeadState,
} from "~/server/workflow/lead/domain/state";

export type LeadReadRepository = {
  findById(id: string): Promise<LeadState | undefined>;
};

export type LeadRepository = {
  insert(values: LeadDraft): Promise<string>;
  findById(id: string): Promise<LeadState | undefined>;
  // Includes soft-deleted leads. Only the delete command needs this, to make
  // re-deletion an idempotent no-op instead of a not-found error.
  findByIdIncludingDeleted(id: string): Promise<LeadState | undefined>;
  findCommercialScope(leadId: string): Promise<LeadCommercialScope | undefined>;
  findByRuc(ruc: string): Promise<LeadState | undefined>;
  updateCommercialSnapshot(
    leadId: string,
    scope: LeadCommercialScope,
    updatedAt: number,
    updatedBy: number,
  ): Promise<unknown>;
};

type LeadRow = {
  id: string;
  organization_id: OrganizationId;
  executive_id: number;
  created_by: number;
  updated_by: number | null;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  created_at: number;
  updated_at: number;
};

type LeadWithOrganizationRow = LeadRow & {
  ruc: string;
  legal_name: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  deleted_at: number | null;
  reservation_expires_at: number | null;
  version: number;
};
type NewLeadRow = Insertable<Database["workflow_leads"]>;

function toLead(row: LeadWithOrganizationRow): LeadState {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ruc: row.ruc,
    legalName: row.legal_name,
    address: row.address,
    district: row.district,
    department: row.department,
    executiveId: row.executive_id,
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
    executive_id: values.executiveId,
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
    .select([
      "lead.id",
      "lead.organization_id",
      "lead.executive_id",
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
    async insert(values: LeadDraft): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_leads")
        .values({ ...toNewLeadRow(values), id })
        .executeTakeFirstOrThrow();

      return id;
    },

    async findById(id: string) {
      const row = await selectLeadWithOrganization
        .where("lead.id", "=", id)
        .where("lead.deleted_at", "is", null)
        .executeTakeFirst();
      return row ? toLead(row as LeadWithOrganizationRow) : undefined;
    },

    async findByIdIncludingDeleted(id: string) {
      const row = await selectLeadWithOrganization
        .where("lead.id", "=", id)
        .executeTakeFirst();
      return row ? toLead(row as LeadWithOrganizationRow) : undefined;
    },

    async findCommercialScope(
      leadId: string,
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

      if (!row) return undefined;
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

    // Returns the lead that currently holds this RUC.
    // EXPIRED and deleted leads are excluded.
    async findByRuc(ruc: string) {
      const row = await selectLeadWithOrganization
        .where("org.ruc", "=", ruc)
        .where("lead.deleted_at", "is", null)
        .where("lead.stage", "!=", "EXPIRED")
        .executeTakeFirst();
      return row ? toLead(row as LeadWithOrganizationRow) : undefined;
    },

    // Leads whose RUC hold has lapsed but that the sweep has not yet retired.
    async findLapsedReservations(now: number): Promise<string[]> {
      const rows = await db
        .selectFrom("workflow_leads")
        .select("id")
        .where("reservation_expires_at", "is not", null)
        .where("reservation_expires_at", "<=", now)
        .where("deleted_at", "is", null)
        .where("stage", "=", "PRICING")
        .execute();
      return rows.map((row) => row.id);
    },

    updateCommercialSnapshot(
      leadId: string,
      scope: LeadCommercialScope,
      updatedAt: number,
      updatedBy: number,
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
