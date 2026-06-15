import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { runTestWorkflowCommand } from "@tests/support/workflow/command";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MAX_RATE_REVISION_FILES,
  MAX_RATE_REVISION_ROUNDS,
} from "~/contracts/workflow/limits";
import { requestRateRevision } from "~/server/workflow/domain/lead/commands";
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
    stage: "PRICING",
    status: null,
    prioridad: null,
    createdAt: 100,
    updatedAt: 100,
    deletedAt: null,
    reservationExpiresAt: null,
    version: 0,
    ...overrides,
  };
}

async function seedPendingProposal(
  runtime: TestRuntime,
  input: { leadId: string; proposedBy: number; id?: string },
): Promise<string> {
  const proposalId = input.id ?? `proposal-${input.leadId}`;
  await runtime.ctx.db
    .insertInto("workflow_rate_proposals")
    .values({
      id: proposalId,
      lead_id: input.leadId,
      round: 1,
      tarifa_debito: 1.5,
      tarifa_credito: 2.5,
      tarifa_foraneo: 3.5,
      fee: 0.6,
      payback_pricing: 11,
      moneda: "PEN",
      proposed_by: input.proposedBy,
      proposed_at: runtime.now.get(),
      outcome: "pending",
      decided_at: null,
    })
    .execute();
  return proposalId;
}

async function seedRateRevisionArtifact(
  runtime: TestRuntime,
  input: {
    artifactId: string;
    leadId: string;
    requestedByUserId: number;
    status?: "ready" | "requested";
    linkedRevisionId?: string;
  },
): Promise<void> {
  const now = runtime.now.get();
  await runtime.ctx.db
    .insertInto("workflow_artifacts")
    .values({
      id: input.artifactId,
      artifact_type: "rate_revision_file",
      direction: "upload",
      execution_mode: "async",
      status: input.status ?? "ready",
      requested_by_user_id: input.requestedByUserId,
      scope_branch_id: 1,
      scope_team_id: null,
      policy_snapshot_json: "{}",
      workflow_context_json: JSON.stringify({
        kind: "rate_revision_file",
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

  if (!input.linkedRevisionId) return;

  await runtime.ctx.db
    .insertInto("workflow_rate_revision_files")
    .values({
      lead_id: input.leadId,
      revision_id: input.linkedRevisionId,
      artifact_id: input.artifactId,
      file_asset_id: fileAssetId,
      uploaded_by_user_id: input.requestedByUserId,
      created_at: now,
    })
    .executeTakeFirstOrThrow();
}

async function countRateRevisions(
  runtime: TestRuntime,
  leadId: string,
): Promise<number> {
  const row = await runtime.ctx.db
    .selectFrom("workflow_rate_revisions")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("lead_id", "=", leadId)
    .executeTakeFirstOrThrow();
  return row.count;
}

describe("lead action policy", () => {
  it("blocks non-owners from owner-only pricing actions", () => {
    const lead = { executiveId: 1, stage: "PRICING" } as const;

    expect(
      authorizeLeadAction(
        "request-rate-revision",
        { userId: 2, role: "executive" },
        lead,
      ).ok,
    ).toBe(false);

    expect(
      authorizeLeadAction("accept-rate", { userId: 2, role: "executive" }, lead)
        .ok,
    ).toBe(false);
  });

  it("lets back office propose rates but not decide executive-only actions", () => {
    const lead = { executiveId: 1, stage: "PRICING" } as const;

    expect(
      authorizeLeadAction(
        "propose-rate",
        { userId: 2, role: "back_office" },
        lead,
      ).ok,
    ).toBe(true);

    expect(
      authorizeLeadAction(
        "request-rate-revision",
        { userId: 2, role: "back_office" },
        lead,
      ).ok,
    ).toBe(false);
  });

  it("keeps delete restricted to management roles", () => {
    expect(
      authorizeLeadAction("delete", { userId: 1, role: "executive" }, {
        executiveId: 1,
        stage: "PRICING",
      } as const).ok,
    ).toBe(false);

    expect(
      authorizeLeadAction("delete", { userId: 2, role: "sales_manager" }, {
        executiveId: 1,
        stage: "PRICING",
      } as const).ok,
    ).toBe(true);
  });

  it("validates rate revision document and round limits in the transition", () => {
    expect(
      expectErr(
        requestRateRevision(makeLeadState(), {
          actor: { userId: 1, role: "executive" },
          revisionId: "revision-1",
          round: MAX_RATE_REVISION_ROUNDS + 1,
          justification: "Need better rate",
          artifactIds: ["artifact-1"],
          reservationExpiresAt: 200,
          now: 100,
        }),
      ).code,
    ).toBe("max_rate_revision_rounds_reached");

    expect(
      expectErr(
        requestRateRevision(makeLeadState(), {
          actor: { userId: 1, role: "executive" },
          revisionId: "revision-1",
          round: 1,
          justification: "Need better rate",
          artifactIds: [],
          reservationExpiresAt: 200,
          now: 100,
        }),
      ).code,
    ).toBe("rate_revision_files_required");

    expect(
      expectErr(
        requestRateRevision(makeLeadState(), {
          actor: { userId: 1, role: "executive" },
          revisionId: "revision-1",
          round: 1,
          justification: "Need better rate",
          artifactIds: Array.from(
            { length: MAX_RATE_REVISION_FILES + 1 },
            (_, index) => `artifact-${index}`,
          ),
          reservationExpiresAt: 200,
          now: 100,
        }),
      ).code,
    ).toBe("max_rate_revision_files_exceeded");

    expect(
      expectErr(
        requestRateRevision(makeLeadState(), {
          actor: { userId: 1, role: "executive" },
          revisionId: "revision-1",
          round: 1,
          justification: "Need better rate",
          artifactIds: ["artifact-1", "artifact-1"],
          reservationExpiresAt: 200,
          now: 100,
        }),
      ).code,
    ).toBe("duplicate_rate_revision_file");
  });

  it("surfaces pricing actions from proposal state", () => {
    expect(
      resolveAvailableActions(
        { userId: 2, role: "back_office" },
        makeLeadState(),
        { hasActivePendingProposal: false, rateRevisionCount: 0 },
      ),
    ).toContain("propose-rate");

    const executiveActions = resolveAvailableActions(
      { userId: 1, role: "executive" },
      makeLeadState(),
      { hasActivePendingProposal: true, rateRevisionCount: 0 },
    );
    expect(executiveActions).toContain("accept-rate");
    expect(executiveActions).toContain("request-rate-revision");

    expect(
      resolveAvailableActions(
        { userId: 1, role: "executive" },
        makeLeadState(),
        {
          hasActivePendingProposal: true,
          rateRevisionCount: MAX_RATE_REVISION_ROUNDS,
        },
      ),
    ).not.toContain("request-rate-revision");
  });
});

describe("request rate revision command", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-action-policy");
    runtime.now.set(1_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("requires a pending proposal before opening a revision round", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "revision-no-proposal",
      organization: { key: "revision-no-proposal" },
      stage: "PRICING",
    });
    await seedRateRevisionArtifact(runtime, {
      artifactId: "artifact-no-proposal",
      leadId: lead.id,
      requestedByUserId: actor.userId,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateRevision({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-no-proposal"],
      }),
    );

    expect(expectErr(result).code).toBe("rate_proposal_not_found");
    expect(await countRateRevisions(runtime, lead.id)).toBe(0);
  });

  it("creates a revision, links ready files, and marks the proposal decided", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "revision-ready",
      organization: { key: "revision-ready" },
      stage: "PRICING",
    });
    const proposalId = await seedPendingProposal(runtime, {
      leadId: lead.id,
      proposedBy: scenario.actor.by("backOne").userId,
    });
    await seedRateRevisionArtifact(runtime, {
      artifactId: "artifact-ready-1",
      leadId: lead.id,
      requestedByUserId: actor.userId,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateRevision({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-ready-1"],
      }),
    );

    expectOk(result);

    const proposal = await runtime.ctx.db
      .selectFrom("workflow_rate_proposals")
      .select(["outcome"])
      .where("id", "=", proposalId)
      .executeTakeFirstOrThrow();
    expect(proposal.outcome).toBe("revision_requested");

    const revision = await runtime.ctx.db
      .selectFrom("workflow_rate_revisions")
      .select(["id", "round", "justification"])
      .where("lead_id", "=", lead.id)
      .executeTakeFirstOrThrow();
    expect(revision).toMatchObject({
      round: 1,
      justification: "Need better rate",
    });

    const files = await runtime.ctx.db
      .selectFrom("workflow_rate_revision_files")
      .select(["artifact_id", "uploaded_by_user_id"])
      .where("revision_id", "=", revision.id)
      .execute();
    expect(files).toEqual([
      {
        artifact_id: "artifact-ready-1",
        uploaded_by_user_id: actor.userId,
      },
    ]);
  });

  it("rolls back when duplicate artifact ids fail transition validation", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "revision-duplicate",
      organization: { key: "revision-duplicate" },
      stage: "PRICING",
    });
    const proposalId = await seedPendingProposal(runtime, {
      leadId: lead.id,
      proposedBy: scenario.actor.by("backOne").userId,
    });
    await seedRateRevisionArtifact(runtime, {
      artifactId: "artifact-dup",
      leadId: lead.id,
      requestedByUserId: actor.userId,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateRevision({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-dup", "artifact-dup"],
      }),
    );

    expect(expectErr(result).code).toBe("duplicate_rate_revision_file");
    expect(await countRateRevisions(runtime, lead.id)).toBe(0);

    const proposal = await runtime.ctx.db
      .selectFrom("workflow_rate_proposals")
      .select(["outcome"])
      .where("id", "=", proposalId)
      .executeTakeFirstOrThrow();
    expect(proposal.outcome).toBe("pending");
  });

  it.each([
    {
      name: "uploaded by another user",
      artifactId: "artifact-other-user",
      override: (scenario: ReturnType<typeof createWorkflowScenario>) => ({
        requestedByUserId: scenario.actor.by("execTwo").userId,
      }),
    },
    {
      name: "attached to another lead",
      artifactId: "artifact-other-lead",
      override: () => ({ leadId: "lead-external" }),
    },
    {
      name: "not ready",
      artifactId: "artifact-not-ready",
      override: () => ({ status: "requested" as const }),
    },
  ])(
    "rejects a staged file that is $name",
    async ({ artifactId, override }) => {
      const scenario = createWorkflowScenario(runtime);
      const actor = scenario.actor.by("execOne");
      const lead = await scenario.lead.assignedTo("execOne", {
        key: artifactId,
        organization: { key: artifactId },
        stage: "PRICING",
      });
      await seedPendingProposal(runtime, {
        leadId: lead.id,
        proposedBy: scenario.actor.by("backOne").userId,
      });
      const artifactOverride = override(scenario);
      await seedRateRevisionArtifact(runtime, {
        artifactId,
        leadId: lead.id,
        requestedByUserId: actor.userId,
        ...artifactOverride,
      });

      const result = await runTestWorkflowCommand(runtime, (commandApi) =>
        commandApi.requestRateRevision({
          actor,
          leadId: lead.id,
          justification: "Need better rate",
          artifactIds: [artifactId],
        }),
      );

      expect(expectErr(result).code).toBe(
        "rate_revision_file_not_submit_ready",
      );
      expect(await countRateRevisions(runtime, lead.id)).toBe(0);
    },
  );

  it("rejects already linked revision files", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "revision-linked",
      organization: { key: "revision-linked" },
      stage: "PRICING",
    });
    const proposalId = await seedPendingProposal(runtime, {
      leadId: lead.id,
      proposedBy: scenario.actor.by("backOne").userId,
    });
    await runtime.ctx.db
      .insertInto("workflow_rate_revisions")
      .values({
        id: "revision-existing",
        lead_id: lead.id,
        proposal_id: proposalId,
        round: 1,
        justification: "Previous revision",
        requested_by: actor.userId,
        requested_at: runtime.now.get(),
      })
      .execute();
    await seedRateRevisionArtifact(runtime, {
      artifactId: "artifact-linked",
      leadId: lead.id,
      requestedByUserId: actor.userId,
      linkedRevisionId: "revision-existing",
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateRevision({
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: ["artifact-linked"],
      }),
    );

    expect(expectErr(result).code).toBe("rate_revision_file_not_submit_ready");
    expect(await countRateRevisions(runtime, lead.id)).toBe(1);
  });
});
