import type { SettlementBank } from "~/contracts/workflow/vocabulary";
import { registerLead as workflowRegisterLead } from "~/server/workflow/lead/write/register-lead";

import type { TestRuntime } from "../runtime/app";
import { registerLeadPorts } from "./deps";
import { MERCHANT } from "./fixtures";

export type RegisteredLeadSnapshot = {
  id: string;
  organizationId: string;
  organizationRuc: string;
  organizationLegalName: string | null;
  organizationAddress: string | null;
  organizationGiroNegocio: string | null;
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
  leadId: string;
  snapshot: RegisteredLeadSnapshot;
  commercial: RegisteredLeadCommercialSnapshot;
  historyEventTypes: string[];
};

export async function registerLead(input: {
  runtime: TestRuntime;
  ruc: string;
  actor?: { userId: number; role: "executive" | "admin"; branchId: number };
  currentProvider?: string;
  currentDebitRate?: number;
  currentCreditRate?: number;
  gpv?: number;
  ticket?: number;
  giroNegocio?: string;
  settlementBank?: SettlementBank;
  posCount?: number;
}): Promise<RegisterLeadResult> {
  const actor = input.actor ?? { userId: 1, role: "executive", branchId: 1 };
  const result = await workflowRegisterLead(
    {
      actor,
      ruc: input.ruc,
      currentProvider:
        input.currentProvider ?? MERCHANT.standard.currentProvider,
      currentDebitRate:
        input.currentDebitRate ?? MERCHANT.standard.currentDebitRate,
      currentCreditRate:
        input.currentCreditRate ?? MERCHANT.standard.currentCreditRate,
      gpv: input.gpv ?? MERCHANT.standard.gpv,
      ticket: input.ticket ?? MERCHANT.standard.ticket,
      giroNegocio: input.giroNegocio ?? "Retail",
      settlementBank: input.settlementBank ?? MERCHANT.standard.settlementBank,
      posCount: input.posCount ?? MERCHANT.standard.posCount,
    },
    registerLeadPorts(input.runtime),
  );

  if (!result.ok) {
    throw new Error("register_lead_failed");
  }

  const row = await input.runtime.ctx.db
    .selectFrom("workflow_leads as lead")
    .innerJoin("organizations as org", "org.id", "lead.organization_id")
    .select([
      "lead.id",
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
      "org.giro_negocio",
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
      organizationGiroNegocio: row.giro_negocio,
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
}): Promise<RegisteredLeadSnapshot> {
  const registered = await registerLead(input);
  return registered.snapshot;
}
