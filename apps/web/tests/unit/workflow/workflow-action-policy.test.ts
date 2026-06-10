import { expectErr } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { runTestWorkflowCommand } from "@tests/support/workflow/command";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MAX_NEGOTIATION_FILES,
  MAX_NEGOTIATION_ROUNDS,
} from "~/contracts/workflow/limits";
import { requestRateNegotiation } from "~/server/workflow/domain/lead/commands";
import {
  authorizeLeadAction,
  resolveAvailableActions,
} from "~/server/workflow/domain/lead/policy";
import type { LeadState } from "~/server/workflow/domain/lead/state";

function makeLeadState(overrides: Partial<LeadState> = {}): LeadState {
  return {
    id: "lead-1",
    organizationId: "org-1",
    ruc: "20600000001",
    razonSocial: null,
    address: null,
    district: null,
    department: null,
    executiveId: 1,
    createdBy: 1,
    updatedBy: null,
    stage: "QUOTED",
    status: null,
    prioridad: null,
    createdAt: 100,
    updatedAt: 100,
    deletedAt: null,
    version: 0,
    ...overrides,
  };
}

async function seedNegotiationArtifact(
  runtime: TestRuntime,
  input: {
    artifactId: string;
    leadId: string;
    requestedByUserId: number;
    status?: "ready" | "requested";
    linked?: boolean;
  },
): Promise<void> {
  const now = runtime.now.get();
  await runtime.ctx.db
    .insertInto("workflow_artifacts")
    .values({
      id: input.artifactId,
      artifact_type: "negotiation_file",
      direction: "upload",
      execution_mode: "async",
      status: input.status ?? "ready",
      requested_by_user_id: input.requestedByUserId,
      scope_branch_id: 1,
      scope_team_id: null,
      policy_snapshot_json: "{}",
      workflow_context_json: JSON.stringify({
        kind: "negotiation_file",
        leadId: input.leadId,
      }),
      error_code: null,
      error_message: null,
      expires_at: null,
      created_at: now,
      updated_at: now,
    })
    .executeTakeFirstOrThrow();

  const fileAsset = await runtime.ctx.db
    .insertInto("file_assets")
    .values({
      storage_key: `test/${input.artifactId}.xlsx`,
      original_filename: "support.xlsx",
      safe_display_filename: "support.xlsx",
      detected_mime:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
      size_bytes: 4,
      sha256_hex:
        "0000000000000000000000000000000000000000000000000000000000000000",
      signature_kind: "xlsx",
      scan_status: "clean",
      scan_engine: null,
      scan_reference: null,
      created_at: now,
    })
    .executeTakeFirstOrThrow();
  const fileAssetId = Number(fileAsset.insertId);

  await runtime.ctx.db
    .insertInto("artifact_file_bindings")
    .values({
      artifact_id: input.artifactId,
      file_asset_id: fileAssetId,
      binding_role: "source_upload",
      version_no: 1,
      created_at: now,
    })
    .executeTakeFirstOrThrow();

  if (!input.linked) return;

  const requestId = `request-${input.artifactId}`;
  await runtime.ctx.db
    .insertInto("workflow_negotiation_requests")
    .values({
      id: requestId,
      lead_id: input.leadId,
      round: 1,
      justification: "Existing request",
      requested_by: input.requestedByUserId,
      requested_at: now,
    })
    .executeTakeFirstOrThrow();

  await runtime.ctx.db
    .insertInto("workflow_negotiation_files")
    .values({
      lead_id: input.leadId,
      negotiation_request_id: requestId,
      artifact_id: input.artifactId,
      file_asset_id: fileAssetId,
      uploaded_by_user_id: input.requestedByUserId,
      created_at: now,
    })
    .executeTakeFirstOrThrow();
}

async function expectNoNegotiationRequests(
  runtime: TestRuntime,
  leadId: string,
): Promise<void> {
  const rows = await runtime.ctx.db
    .selectFrom("workflow_negotiation_requests")
    .select(["id"])
    .where("lead_id", "=", leadId)
    .execute();
  expect(rows).toHaveLength(0);
}

describe("lead action policy", () => {
  it("blocks supervisors and sales managers from owner-only lead actions", () => {
    const lead = { executiveId: 1, stage: "QUOTED" } as const;

    expect(
      authorizeLeadAction(
        "request-negotiation",
        { userId: 2, role: "supervisor" },
        lead,
      ).ok,
    ).toBe(false);

    expect(
      authorizeLeadAction(
        "request-negotiation",
        { userId: 2, role: "sales_manager" },
        lead,
      ).ok,
    ).toBe(false);
  });

  it("blocks executives from approving leads assigned to others", () => {
    const result = authorizeLeadAction(
      "approve-for-sale",
      { userId: 2, role: "executive" },
      {
        executiveId: 1,
        stage: "QUOTED",
      } as const,
    );

    const error = expectErr(result);
    expect(error.kind).toBe("forbidden");
  });

  it("blocks the owning executive from deleting their own lead", () => {
    const result = authorizeLeadAction(
      "delete",
      { userId: 1, role: "executive" },
      { executiveId: 1, stage: "QUOTED" } as const,
    );

    expect(expectErr(result).kind).toBe("forbidden");
  });

  it("blocks back_office from deleting despite view-all access", () => {
    const result = authorizeLeadAction(
      "delete",
      { userId: 2, role: "back_office" },
      { executiveId: 1, stage: "QUOTED" } as const,
    );

    expect(expectErr(result).kind).toBe("forbidden");
  });

  it("lets a sales_manager delete any lead", () => {
    const result = authorizeLeadAction(
      "delete",
      { userId: 2, role: "sales_manager" },
      { executiveId: 1, stage: "QUOTED" } as const,
    );

    expect(result.ok).toBe(true);
  });

  it("lets a supervisor delete any lead", () => {
    const result = authorizeLeadAction(
      "delete",
      { userId: 2, role: "supervisor" },
      { executiveId: 1, stage: "QUOTED" } as const,
    );

    expect(result.ok).toBe(true);
  });

  it("enforces negotiation round limit via transition", () => {
    const maxRounds = requestRateNegotiation(makeLeadState(), {
      actor: { userId: 1, role: "executive" },
      negotiationRequestId: "req-1",
      round: MAX_NEGOTIATION_ROUNDS + 1,
      justification: "Need better rate",
      artifactIds: ["artifact-1"],
      now: 100,
    });
    const error = expectErr(maxRounds);
    expect(error.code).toBe("max_negotiation_rounds_reached");
  });

  it("enforces negotiation file limit via transition", () => {
    const maxFiles = requestRateNegotiation(makeLeadState(), {
      actor: { userId: 1, role: "executive" },
      negotiationRequestId: "req-1",
      round: 1,
      justification: "Need better rate",
      artifactIds: Array.from(
        { length: MAX_NEGOTIATION_FILES + 1 },
        (_, index) => `artifact-${index}`,
      ),
      now: 100,
    });
    const error = expectErr(maxFiles);
    expect(error.code).toBe("max_negotiation_files_exceeded");
  });

  it("rejects duplicate negotiation files via transition", () => {
    const duplicate = requestRateNegotiation(makeLeadState(), {
      actor: { userId: 1, role: "executive" },
      negotiationRequestId: "req-1",
      round: 1,
      justification: "Need better rate",
      artifactIds: ["artifact-1", "artifact-1"],
      now: 100,
    });
    const error = expectErr(duplicate);
    expect(error.code).toBe("duplicate_negotiation_file");
  });

  it("rejects an empty document set via transition", () => {
    const empty = requestRateNegotiation(makeLeadState(), {
      actor: { userId: 1, role: "executive" },
      negotiationRequestId: "req-1",
      round: 1,
      justification: "Need better rate",
      artifactIds: [],
      now: 100,
    });
    const error = expectErr(empty);
    expect(error.code).toBe("negotiation_files_required");
  });

  it("hides request negotiation when the round limit is reached", () => {
    const actions = resolveAvailableActions(
      { userId: 1, role: "executive" },
      makeLeadState(),
      { negotiationRequestCount: MAX_NEGOTIATION_ROUNDS },
    );

    expect(actions).not.toContain("request-rate-negotiation");
  });
});

describe("workflow action commands", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-action-policy");
    runtime.now.set(1_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("blocks approve-for-sale for executives on leads assigned to others", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-approve",
      organization: { key: "policy-approve" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.approveForSale({
        actor: scenario.actor.by("execTwo"),
        leadId: lead.id,
      }),
    );

    expectErr(result);
    const row = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["stage"])
      .where("id", "=", lead.id)
      .executeTakeFirstOrThrow();
    expect(row.stage).toBe("QUOTED");
  });

  it("blocks rate negotiation when no files are attached and does not persist requests", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation",
      organization: { key: "policy-negotiation" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateNegotiation({
        actor: scenario.actor.by("execOne"),
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: [],
      }),
    );

    expectErr(result);
    const rows = await runtime.ctx.db
      .selectFrom("workflow_negotiation_requests")
      .select(["id"])
      .where("lead_id", "=", lead.id)
      .execute();
    expect(rows).toHaveLength(0);
  });

  it("creates a rate negotiation with ready staged artifacts", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation-ready",
      organization: { key: "policy-negotiation-ready" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedNegotiationArtifact(runtime, {
      artifactId: "artifact-ready-1",
      leadId: lead.id,
      requestedByUserId: actor.userId,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateNegotiation({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-ready-1"],
      }),
    );

    expect(result.ok).toBe(true);
    const request = await runtime.ctx.db
      .selectFrom("workflow_negotiation_requests")
      .select(["id"])
      .where("lead_id", "=", lead.id)
      .executeTakeFirstOrThrow();
    const files = await runtime.ctx.db
      .selectFrom("workflow_negotiation_files")
      .select(["artifact_id", "uploaded_by_user_id"])
      .where("negotiation_request_id", "=", request.id)
      .execute();
    expect(files).toEqual([
      {
        artifact_id: "artifact-ready-1",
        uploaded_by_user_id: actor.userId,
      },
    ]);
  });

  it("rejects duplicate rate negotiation artifact ids and does not persist requests", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation-duplicate",
      organization: { key: "policy-negotiation-duplicate" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedNegotiationArtifact(runtime, {
      artifactId: "artifact-dup",
      leadId: lead.id,
      requestedByUserId: actor.userId,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateNegotiation({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-dup", "artifact-dup"],
      }),
    );

    const error = expectErr(result);
    expect(error.code).toBe("duplicate_negotiation_file");
    await expectNoNegotiationRequests(runtime, lead.id);
  });

  it("rejects staged negotiation artifacts uploaded by another user", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation-owner",
      organization: { key: "policy-negotiation-owner" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedNegotiationArtifact(runtime, {
      artifactId: "artifact-other-user",
      leadId: lead.id,
      requestedByUserId: scenario.actor.by("execTwo").userId,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateNegotiation({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-other-user"],
      }),
    );

    const error = expectErr(result);
    expect(error.code).toBe("negotiation_file_not_submit_ready");
    await expectNoNegotiationRequests(runtime, lead.id);
  });

  it("rejects staged negotiation artifacts for another lead", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation-lead",
      organization: { key: "policy-negotiation-lead" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });
    const otherLead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation-other-lead",
      organization: { key: "policy-negotiation-other-lead" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedNegotiationArtifact(runtime, {
      artifactId: "artifact-other-lead",
      leadId: otherLead.id,
      requestedByUserId: actor.userId,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateNegotiation({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-other-lead"],
      }),
    );

    const error = expectErr(result);
    expect(error.code).toBe("negotiation_file_not_submit_ready");
    await expectNoNegotiationRequests(runtime, lead.id);
  });

  it("rejects non-ready staged negotiation artifacts", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation-status",
      organization: { key: "policy-negotiation-status" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedNegotiationArtifact(runtime, {
      artifactId: "artifact-not-ready",
      leadId: lead.id,
      requestedByUserId: actor.userId,
      status: "requested",
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateNegotiation({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-not-ready"],
      }),
    );

    const error = expectErr(result);
    expect(error.code).toBe("negotiation_file_not_submit_ready");
    await expectNoNegotiationRequests(runtime, lead.id);
  });

  it("rejects already linked staged negotiation artifacts", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation-linked",
      organization: { key: "policy-negotiation-linked" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedNegotiationArtifact(runtime, {
      artifactId: "artifact-linked",
      leadId: lead.id,
      requestedByUserId: actor.userId,
      linked: true,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateNegotiation({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-linked"],
      }),
    );

    const error = expectErr(result);
    expect(error.code).toBe("negotiation_file_not_submit_ready");
    const rows = await runtime.ctx.db
      .selectFrom("workflow_negotiation_requests")
      .select(["id"])
      .where("lead_id", "=", lead.id)
      .execute();
    expect(rows).toHaveLength(1);
  });
});
