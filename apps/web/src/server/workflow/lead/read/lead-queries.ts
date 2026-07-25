import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { Role } from "~/domain/auth/access/rbac";
import type { BranchId, UserId, WorkflowLeadId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { applyLeadListFilters, applyLeadVisibility } from "./lead-list-filters";

export type LeadListFilters = {
  actorUserId: UserId;
  actorRole: Role;
  actorBranchId: BranchId;
  executiveId?: UserId;
  stage?: LeadStage;
  status?: LeadStatus;
  priority?: LeadPriority;
  updatedSince?: Date;
  updatedUntil?: Date;
  anyFieldSearch?: string;
  sortBy: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection: "asc" | "desc";
  limit: number;
  offset: number;
};

export type RecordExportFilters = {
  actorUserId: UserId;
  actorRole: Role;
  actorBranchId: BranchId;
  executiveId?: UserId;
};

export type LeadListRow = {
  id: WorkflowLeadId;
  ruc: string;
  legalName: string | null;
  address: string | null;
  executiveId: UserId;
  executiveName: string;
  createdBy: UserId;
  createdByName: string;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  createdAt: number;
  updatedAt: number;
};

export type RecordExportRow = {
  id: WorkflowLeadId;
  ruc: string;
  legalName: string | null;
  address: string | null;
  stage: LeadStage;
  status: LeadStatus | null;
  priority: LeadPriority | null;
  createdAt: number;
  executiveId: UserId;
  executiveName: string;
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  proposedDebitRate: number | null;
  proposedCreditRate: number | null;
};

export type LeadQueries = {
  list(filters: LeadListFilters): Promise<LeadListRow[]>;
  count(filters: LeadListFilters): Promise<number>;
  export(filters: RecordExportFilters): Promise<RecordExportRow[]>;
};

function toFullName(names: string, firstSurname: string): string {
  return `${names} ${firstSurname}`;
}

export function createLeadQueries(db: DatabaseExecutor): LeadQueries {
  return {
    async list(filters) {
      const base = db
        .selectFrom("workflow_leads as lead")
        .innerJoin(
          "organization_current_owners as owner",
          "owner.organization_id",
          "lead.organization_id",
        )
        .innerJoin("users as executive", "executive.id", "owner.executive_id");

      let q = applyLeadVisibility(base, filters)
        .innerJoin("users as creator", "creator.id", "lead.created_by")
        .innerJoin("organizations as org", "org.id", "lead.organization_id")
        .select([
          "lead.id",
          "org.ruc",
          "org.legal_name",
          "org.address",
          "owner.executive_id",
          "executive.names as executive_names",
          "executive.first_surname as executive_first_surname",
          "lead.created_by",
          "creator.names as creator_names",
          "creator.first_surname as creator_first_surname",
          "lead.stage",
          "lead.status",
          "lead.priority",
          "lead.created_at",
          "lead.updated_at",
        ]);

      q = applyLeadListFilters(q, filters);

      if (filters.sortBy === "createdAt")
        q = q.orderBy("lead.created_at", filters.sortDirection);
      else if (filters.sortBy === "updatedAt")
        q = q.orderBy("lead.updated_at", filters.sortDirection);
      else if (filters.sortBy === "registeredBy") {
        q = q
          .orderBy("creator.names", filters.sortDirection)
          .orderBy("creator.first_surname", filters.sortDirection);
      } else q = q.orderBy("org.ruc", filters.sortDirection);

      const rows = await q
        .orderBy("lead.id", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();

      return rows.map((row) => ({
        id: row.id,
        ruc: row.ruc,
        legalName: row.legal_name,
        address: row.address,
        executiveId: row.executive_id,
        executiveName: toFullName(
          row.executive_names,
          row.executive_first_surname,
        ),
        createdBy: row.created_by,
        createdByName: toFullName(row.creator_names, row.creator_first_surname),
        stage: row.stage,
        status: row.status,
        priority: row.priority,
        createdAt: row.created_at.getTime(),
        updatedAt: row.updated_at.getTime(),
      }));
    },

    async count(filters) {
      let q = applyLeadVisibility(
        db
          .selectFrom("workflow_leads as lead")
          .innerJoin(
            "organization_current_owners as owner",
            "owner.organization_id",
            "lead.organization_id",
          )
          .innerJoin("users as executive", "executive.id", "owner.executive_id")
          .innerJoin("users as creator", "creator.id", "lead.created_by")
          .innerJoin("organizations as org", "org.id", "lead.organization_id")
          .select((eb) => eb.fn.countAll<number>().as("count")),
        filters,
      );

      q = applyLeadListFilters(q, filters);

      const row = await q.executeTakeFirstOrThrow();
      return Number(row.count);
    },

    async export(filters) {
      const base = db
        .selectFrom("workflow_leads as lead")
        .innerJoin(
          "organization_current_owners as owner",
          "owner.organization_id",
          "lead.organization_id",
        )
        .innerJoin("users as executive", "executive.id", "owner.executive_id");
      let q = applyLeadVisibility(base, filters)
        .innerJoin("organizations as org", "org.id", "lead.organization_id")
        // Latest rate proposal per lead (MAX(round) keeps one row even when
        // earlier rounds exist). Back office's offer is the lead's Culqi rates.
        .leftJoin(
          (eb) =>
            eb
              .selectFrom("workflow_rate_proposals")
              .select((e) => [
                "workflow_rate_proposals.lead_id as lead_id",
                e.fn.max("workflow_rate_proposals.round").as("round"),
              ])
              .groupBy("workflow_rate_proposals.lead_id")
              .as("latest_rate"),
          (join) => join.onRef("latest_rate.lead_id", "=", "lead.id"),
        )
        .leftJoin("workflow_rate_proposals as rate", (join) =>
          join
            .onRef("rate.lead_id", "=", "latest_rate.lead_id")
            .onRef("rate.round", "=", "latest_rate.round"),
        )
        .select([
          "lead.id",
          "org.ruc",
          "org.legal_name",
          "org.address",
          "owner.executive_id",
          "executive.names as executive_names",
          "executive.first_surname as executive_first_surname",
          "lead.stage",
          "lead.status",
          "lead.priority",
          "lead.created_at",
          "lead.current_provider",
          "lead.current_debit_rate",
          "lead.current_credit_rate",
          "lead.gpv",
          "rate.proposed_debit_rate",
          "rate.proposed_credit_rate",
        ]);

      if (filters.executiveId !== undefined) {
        q = q.where("owner.executive_id", "=", filters.executiveId);
      }

      const rows = await q.orderBy("lead.created_at", "desc").execute();

      return rows.map((row) => ({
        id: row.id,
        ruc: row.ruc,
        legalName: row.legal_name,
        address: row.address,
        executiveId: row.executive_id,
        executiveName: toFullName(
          row.executive_names,
          row.executive_first_surname,
        ),
        stage: row.stage,
        status: row.status,
        priority: row.priority,
        createdAt: row.created_at.getTime(),
        currentProvider: row.current_provider,
        currentDebitRate: row.current_debit_rate,
        currentCreditRate: row.current_credit_rate,
        gpv: row.gpv,
        proposedDebitRate: row.proposed_debit_rate,
        proposedCreditRate: row.proposed_credit_rate,
      }));
    },
  };
}
