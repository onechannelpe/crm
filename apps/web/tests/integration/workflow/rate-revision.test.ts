import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { runTestWorkflowCommand } from "@tests/support/workflow/command";
import { proposePendingRate } from "@tests/support/workflow/pricing";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

type Scenario = ReturnType<typeof createWorkflowScenario>;

// Cross-subsystem fixture: stages a rate-revision file artifact (workflow_artifacts +
// file_assets + bindings). This is the files/upload subsystem, not workflow lead state, and
// has no workflow command to reach it, so it is seeded directly here rather than driven.
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

describe("request rate revision command", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-rate-revision");
    runtime.now.set(1_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  async function loadDetail(scenario: Scenario, leadId: string) {
    return expectOk(
      await runtime.workflow.queries.getLeadDetail({
        actor: scenario.actor.by("execOne"),
        leadId,
      }),
    );
  }

  it("requires a pending proposal before opening a revision round", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.atStage("PRICING", {
      key: "revision-no-proposal",
      organization: { key: "revision-no-proposal" },
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
    expect((await loadDetail(scenario, lead.id)).rateRevisions).toHaveLength(0);
  });

  it("creates a revision, links ready files, and marks the proposal decided", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.atStage("PRICING", {
      key: "revision-ready",
      organization: { key: "revision-ready" },
    });
    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: scenario.actor.by("backOne"),
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

    const detail = await loadDetail(scenario, lead.id);
    const proposal = detail.rateProposals.find((p) => p.id === proposalId);
    expect(proposal?.outcome).toBe("revision_requested");

    expect(detail.rateRevisions).toHaveLength(1);
    expect(detail.rateRevisions[0]).toMatchObject({
      round: 1,
      justification: "Need better rate",
    });
    expect(detail.rateRevisions[0].files.map((f) => f.artifactId)).toEqual([
      "artifact-ready-1",
    ]);
  });

  it("rolls back when duplicate artifact ids fail transition validation", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.atStage("PRICING", {
      key: "revision-duplicate",
      organization: { key: "revision-duplicate" },
    });
    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: scenario.actor.by("backOne"),
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

    const detail = await loadDetail(scenario, lead.id);
    expect(detail.rateRevisions).toHaveLength(0);
    expect(detail.rateProposals.find((p) => p.id === proposalId)?.outcome).toBe(
      "pending",
    );
  });

  it.each([
    {
      name: "uploaded by another user",
      artifactId: "artifact-other-user",
      override: (scenario: Scenario) => ({
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
      const lead = await scenario.lead.atStage("PRICING", {
        key: artifactId,
        organization: { key: artifactId },
      });
      await proposePendingRate(runtime, {
        leadId: lead.id,
        backOffice: scenario.actor.by("backOne"),
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
      expect((await loadDetail(scenario, lead.id)).rateRevisions).toHaveLength(
        0,
      );
    },
  );

  it("rejects already linked revision files", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.atStage("PRICING", {
      key: "revision-linked",
      organization: { key: "revision-linked" },
    });
    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: scenario.actor.by("backOne"),
    });
    // A revision that already owns the artifact, while the proposal is still pending:
    // an edge a simple command sequence cannot reach (a real revision would decide the
    // proposal), so it is seeded directly.
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
    expect((await loadDetail(scenario, lead.id)).rateRevisions).toHaveLength(1);
  });
});
