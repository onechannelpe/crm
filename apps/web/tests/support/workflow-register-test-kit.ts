import type { TestRuntime } from "./runtime/create-test-runtime";
import { runTestWorkflowCommand } from "./workflow-test-kit";

export type RegisteredLeadSnapshot = {
  id: string;
  organizationId: number;
  organizationRuc: string;
  organizationName: string;
  organizationAddress: string | null;
};

export async function registerLeadAndLoadSnapshot(input: {
  runtime: TestRuntime;
  ruc: string;
  enrichByRuc?: () => Promise<{
    razonSocial: string | null;
    address: string | null;
  } | null>;
}): Promise<RegisteredLeadSnapshot> {
  const result = await runTestWorkflowCommand(
    input.runtime,
    (commandApi) =>
      commandApi.registerLead({
        actor: { userId: 1, role: "admin", branchId: 1 },
        ruc: input.ruc,
        executiveId: 1,
      }),
    input.enrichByRuc
      ? {
          engineGateway: {
            enrichByRuc: input.enrichByRuc,
          },
        }
      : undefined,
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

  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationRuc: row.ruc,
    organizationName: row.name,
    organizationAddress: row.address,
  };
}
