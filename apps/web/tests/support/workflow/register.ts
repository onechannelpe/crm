import type { TestRuntime } from "../runtime/app";
import { runTestWorkflowCommand, type TestCommandOverrides } from "./command";

export type RegisteredLeadSnapshot = {
  id: string;
  organizationId: string;
  organizationRuc: string;
  organizationName: string;
  organizationAddress: string | null;
};

export type RegisterLeadResult = {
  leadId: string;
  snapshot: RegisteredLeadSnapshot;
  historyEventTypes: string[];
};

export async function registerLead(input: {
  runtime: TestRuntime;
  ruc: string;
  actor?: { userId: number; role: "admin" | "executive"; branchId: number };
  executiveId?: number;
  enrichByRuc?: () => Promise<{
    razonSocial: string | null;
    address: string | null;
  } | null>;
  commandOverrides?: TestCommandOverrides;
}): Promise<RegisterLeadResult> {
  const actor = input.actor ?? { userId: 1, role: "admin", branchId: 1 };
  const executiveId = input.executiveId ?? 1;
  const result = await runTestWorkflowCommand(
    input.runtime,
    (commandApi) =>
      commandApi.registerLead({
        actor,
        ruc: input.ruc,
        executiveId,
      }),
    {
      ...(input.enrichByRuc
        ? {
            engineGateway: {
              enrichByRuc: input.enrichByRuc,
            },
          }
        : {}),
      ...(input.commandOverrides ?? {}),
    },
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
    ])
    .where("lead.id", "=", result.value.leadId)
    .executeTakeFirstOrThrow();

  const history = await input.runtime.ctx.db
    .selectFrom("workflow_history_events")
    .select(["event_type"])
    .where("lead_id", "=", result.value.leadId)
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
    },
    historyEventTypes: history.map((event) => event.event_type),
  };
}

export async function registerLeadAndLoadSnapshot(input: {
  runtime: TestRuntime;
  ruc: string;
  enrichByRuc?: () => Promise<{
    razonSocial: string | null;
    address: string | null;
  } | null>;
}): Promise<RegisteredLeadSnapshot> {
  const registered = await registerLead(input);
  return registered.snapshot;
}
