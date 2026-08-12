import type { SettlementBank } from "~/contracts/workflow/vocabulary";
import type {
  BranchId,
  OrganizationId,
  UserId,
  WorkflowLeadId,
} from "~/domain/ids";
import type { OperationContext } from "~/server/platform/operation/context";

import { actorBy } from "../database/workflow-fixtures";
import { withMerchantDefaults } from "../database/workflow-seed";
import { DEFAULT_OPERATION } from "../operation";
import type { TestRuntime } from "../runtime/app";

export type RegisteredLeadSnapshot = {
  id: WorkflowLeadId;
  organizationId: OrganizationId;
  organizationRuc: string;
  organizationLegalName: string | null;
  organizationAddress: string | null;
  organizationLineOfBusiness: string | null;
};

export type RegisteredLeadCommercialSnapshot = {
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  ticket: number;
  settlementBank: string;
  posCount: number;
};

export type RegisterLeadResult = {
  leadId: WorkflowLeadId;
  snapshot: RegisteredLeadSnapshot;
  commercial: RegisteredLeadCommercialSnapshot;
  historyEventTypes: string[];
};

export async function registerLead(input: {
  runtime: TestRuntime;
  ruc: string;
  actor?: { userId: UserId; role: "executive" | "admin"; branchId: BranchId };
  currentProvider?: string;
  currentDebitRate?: number;
  currentCreditRate?: number;
  gpv?: number;
  ticket?: number;
  lineOfBusiness?: string | null;
  settlementBank?: SettlementBank;
  posCount?: number;
  operation?: OperationContext;
}): Promise<RegisterLeadResult> {
  const actor = input.actor ?? actorBy("execOne");
  const result = await input.runtime.workflow.commands.registerLead(
    {
      actor,
      ruc: input.ruc,
      ...withMerchantDefaults(input),
      lineOfBusiness: input.lineOfBusiness ?? "Retail",
    },
    input.operation ?? DEFAULT_OPERATION,
  );

  if (!result.ok) {
    throw new Error("register_lead_failed");
  }

  const row = await input.runtime.ctx.db
    .selectFrom("workflow_leads as lead")
    .innerJoin("organizations as org", "org.id", "lead.organization_id")
    .select((eb) => [
      eb.ref("lead.id").as("id"),
      "lead.organization_id",
      "lead.current_provider",
      "lead.current_debit_rate",
      "lead.current_credit_rate",
      "lead.gpv",
      "lead.ticket",
      "lead.settlement_bank",
      "lead.pos_count",
      "org.ruc",
      "org.legal_name",
      "org.address",
      "org.line_of_business",
    ])
    .where("lead.id", "=", result.value.leadId)
    .executeTakeFirstOrThrow();

  const history = await input.runtime.ctx.db
    .selectFrom("events")
    .select(["type"])
    .where("entity_type", "=", "lead")
    .where("entity_id", "=", result.value.leadId)
    .orderBy("occurred_at", "asc")
    .execute();

  return {
    leadId: result.value.leadId,
    snapshot: {
      id: row.id,
      organizationId: row.organization_id,
      organizationRuc: row.ruc,
      organizationLegalName: row.legal_name,
      organizationAddress: row.address,
      organizationLineOfBusiness: row.line_of_business,
    },
    commercial: {
      currentProvider: row.current_provider,
      currentDebitRate: row.current_debit_rate,
      currentCreditRate: row.current_credit_rate,
      gpv: row.gpv,
      ticket: row.ticket,
      settlementBank: row.settlement_bank,
      posCount: row.pos_count,
    },
    historyEventTypes: history.map((event) => event.type),
  };
}

export async function registerLeadAndLoadSnapshot(input: {
  runtime: TestRuntime;
  ruc: string;
  operation?: OperationContext;
}): Promise<RegisteredLeadSnapshot> {
  const registered = await registerLead(input);
  return registered.snapshot;
}
