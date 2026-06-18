import { ABONO_BANKS, type AbonoBank } from "~/contracts/workflow/vocabulary";

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
  proveedorActual: string | null;
  tasaDebitoActual: number | null;
  tasaCreditoActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abonoBank: string | null;
  posTotal: number | null;
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
  proveedorActual?: string;
  tasaDebitoActual?: number;
  tasaCreditoActual?: number;
  gpv?: number;
  ticket?: number;
  giroNegocio?: string;
  abonoBank?: AbonoBank;
  posTotal?: number;
  commandOverrides?: TestCommandOverrides;
}): Promise<RegisterLeadResult> {
  const actor = input.actor ?? { userId: 1, role: "executive", branchId: 1 };
  const result = await runTestWorkflowCommand(
    input.runtime,
    (commandApi) =>
      commandApi.registerLead({
        actor,
        ruc: input.ruc,
        proveedorActual: input.proveedorActual ?? "Niubiz",
        tasaDebitoActual: input.tasaDebitoActual ?? 3.5,
        tasaCreditoActual: input.tasaCreditoActual ?? 4.0,
        gpv: input.gpv ?? 50000,
        ticket: input.ticket ?? 120,
        giroNegocio: input.giroNegocio ?? "Retail",
        abonoBank: input.abonoBank ?? ABONO_BANKS[0],
        posTotal: input.posTotal ?? 2,
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
      "proveedor_actual",
      "tasa_debito_actual",
      "tasa_credito_actual",
      "gpv",
      "ticket",
      "abono_bank",
      "pos_total",
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
          proveedorActual: profileRow.proveedor_actual,
          tasaDebitoActual: profileRow.tasa_debito_actual,
          tasaCreditoActual: profileRow.tasa_credito_actual,
          gpv: profileRow.gpv,
          ticket: profileRow.ticket,
          abonoBank: profileRow.abono_bank,
          posTotal: profileRow.pos_total,
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
