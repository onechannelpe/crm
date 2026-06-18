import { SETTLEMENT_BANKS, type SettlementBank } from "~/contracts/workflow/vocabulary";

import type { TestRuntime } from "../runtime/app";
import { runTestWorkflowCommand, type TestCommandOverrides } from "./command";

export type RegisteredLeadSnapshot = {
  id: string;
  organizationId: string;
  organizationRuc: string;
  organizationName: string;
  organizationAddress: string | null;
  organizationGiroNegocio: string | null;
};

export type RegisteredLeadProfile = {
  currentProvider: string | null;
  currentDebitRate: number | null;
  currentCreditRate: number | null;
  gpv: number | null;
  ticket: number | null;
  settlementBank: string | null;
  posCount: number | null;
};

export type RegisterLeadResult = {
  leadId: string;
  snapshot: RegisteredLeadSnapshot;
  profile: RegisteredLeadProfile | null;
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
  commandOverrides?: TestCommandOverrides;
}): Promise<RegisterLeadResult> {
  const actor = input.actor ?? { userId: 1, role: "executive", branchId: 1 };
  const result = await runTestWorkflowCommand(
    input.runtime,
    (commandApi) =>
      commandApi.registerLead({
        actor,
        ruc: input.ruc,
        currentProvider: input.currentProvider ?? "Niubiz",
        currentDebitRate: input.currentDebitRate ?? 3.5,
        currentCreditRate: input.currentCreditRate ?? 4.0,
        gpv: input.gpv ?? 50000,
        ticket: input.ticket ?? 120,
        giroNegocio: input.giroNegocio ?? "Retail",
        settlementBank: input.settlementBank ?? SETTLEMENT_BANKS[0],
        posCount: input.posCount ?? 2,
      }),
    input.commandOverrides,
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
      "org.ruc",
      "org.name",
      "org.address",
      "org.giro_negocio",
    ])
    .where("lead.id", "=", result.value.leadId)
    .executeTakeFirstOrThrow();

  const profileRow = await input.runtime.ctx.db
    .selectFrom("workflow_lead_profiles")
    .select([
      "current_provider",
      "current_debit_rate",
      "current_credit_rate",
      "gpv",
      "ticket",
      "settlement_bank",
      "pos_count",
    ])
    .where("lead_id", "=", result.value.leadId)
    .executeTakeFirst();

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
      organizationName: row.name,
      organizationAddress: row.address,
      organizationGiroNegocio: row.giro_negocio,
    },
    profile: profileRow
      ? {
          currentProvider: profileRow.current_provider,
          currentDebitRate: profileRow.current_debit_rate,
          currentCreditRate: profileRow.current_credit_rate,
          gpv: profileRow.gpv,
          ticket: profileRow.ticket,
          settlementBank: profileRow.settlement_bank,
          posCount: profileRow.pos_count,
        }
      : null,
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
