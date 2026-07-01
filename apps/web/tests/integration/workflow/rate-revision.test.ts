import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { proposePendingRate } from "@tests/support/integration/pricing";
import {
  workflowCommandPorts,
  workflowRepos,
} from "@tests/support/integration/workflow-ports";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  asWorkflowArtifactId,
  asWorkflowLeadId,
  asWorkflowRateRevisionId,
  type UserId,
  type WorkflowArtifactId,
  type WorkflowLeadId,
  type WorkflowRateRevisionId,
} from "~/server/shared/ids";
import { requestRateRevisionCommand } from "~/server/workflow/lead/commands/request-rate-revision";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";

// Cross-subsystem fixture: stages a rate-revision file artifact (workflow_artifacts +
// file_assets + bindings). This is the files/upload subsystem, not workflow lead state, and
// has no workflow command to reach it, so it is seeded directly here rather than driven.
async function seedRateRevisionArtifact(
  runtime: TestRuntime,
  input: {
    artifactId: WorkflowArtifactId;
    leadId: WorkflowLeadId;
    requestedByUserId: UserId;
    status?: "ready" | "requested";
    linkedRevisionId?: WorkflowRateRevisionId;
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
      scope_branch_id: actorBy("execOne").branchId,
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
    .returning("id")
    .executeTakeFirstOrThrow();
  const fileAssetId = fileAsset.id;

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
    runtime.now.set(new Date(1_000));
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  async function loadDetail(leadId: WorkflowLeadId) {
    const actor = actorBy("execOne");
    return expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId,
      }),
    );
  }

  it("requires a pending proposal before opening a revision round", async () => {
    const actor = actorBy("execOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "pricing",
      proposal: "none",
      key: "revision-no-proposal",
      organization: { key: "revision-no-proposal" },
    });
    const artifactId = asWorkflowArtifactId("artifact-no-proposal");
    await seedRateRevisionArtifact(runtime, {
      artifactId,
      leadId: lead.id,
      requestedByUserId: actor.userId,
    });

    const result = await requestRateRevisionCommand(
      {
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: [artifactId],
      },
      workflowCommandPorts(runtime),
    );

    expect(expectErr(result).code).toBe("rate_proposal_not_found");
    expect((await loadDetail(lead.id)).rateRevisions).toHaveLength(0);
  });

  it("creates a revision, links ready files, and marks the proposal decided", async () => {
    const actor = actorBy("execOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "pricing",
      proposal: "none",
      key: "revision-ready",
      organization: { key: "revision-ready" },
    });
    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: actorBy("backOne"),
    });
    const artifactId = asWorkflowArtifactId("artifact-ready-1");
    await seedRateRevisionArtifact(runtime, {
      artifactId,
      leadId: lead.id,
      requestedByUserId: actor.userId,
    });

    const result = await requestRateRevisionCommand(
      {
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: [artifactId],
      },
      workflowCommandPorts(runtime),
    );

    expectOk(result);

    const detail = await loadDetail(lead.id);
    const proposal = detail.rateProposals.find((p) => p.id === proposalId);
    expect(proposal?.outcome).toBe("revision_requested");

    expect(detail.rateRevisions).toHaveLength(1);
    expect(detail.rateRevisions[0]).toMatchObject({
      round: 1,
      justification: "Need better rate",
    });
    expect(detail.rateRevisions[0].files.map((f) => f.artifactId)).toEqual([
      artifactId,
    ]);
  });

  it("rolls back when duplicate artifact ids fail transition validation", async () => {
    const actor = actorBy("execOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "pricing",
      proposal: "none",
      key: "revision-duplicate",
      organization: { key: "revision-duplicate" },
    });
    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: actorBy("backOne"),
    });
    const artifactId = asWorkflowArtifactId("artifact-dup");
    await seedRateRevisionArtifact(runtime, {
      artifactId,
      leadId: lead.id,
      requestedByUserId: actor.userId,
    });

    const result = await requestRateRevisionCommand(
      {
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: [artifactId, artifactId],
      },
      workflowCommandPorts(runtime),
    );

    expect(expectErr(result).code).toBe("duplicate_rate_revision_file");

    const detail = await loadDetail(lead.id);
    expect(detail.rateRevisions).toHaveLength(0);
    expect(detail.rateProposals.find((p) => p.id === proposalId)?.outcome).toBe(
      "pending",
    );
  });

  it.each([
    {
      name: "uploaded by another user",
      artifactId: asWorkflowArtifactId("artifact-other-user"),
      override: () => ({ requestedByUserId: actorBy("execTwo").userId }),
    },
    {
      name: "attached to another lead",
      artifactId: asWorkflowArtifactId("artifact-other-lead"),
      override: () => ({ leadId: asWorkflowLeadId("lead-external") }),
    },
    {
      name: "not ready",
      artifactId: asWorkflowArtifactId("artifact-not-ready"),
      override: () => ({ status: "requested" as const }),
    },
  ])(
    "rejects a staged file that is $name",
    async ({ artifactId, override }) => {
      const actor = actorBy("execOne");
      const lead = await createLeadFixtureWriter(runtime)({
        kind: "pricing",
        proposal: "none",
        key: artifactId,
        organization: { key: artifactId },
      });
      await proposePendingRate(runtime, {
        leadId: lead.id,
        backOffice: actorBy("backOne"),
      });
      const artifactOverride = override();
      await seedRateRevisionArtifact(runtime, {
        artifactId,
        leadId: lead.id,
        requestedByUserId: actor.userId,
        ...artifactOverride,
      });

      const result = await requestRateRevisionCommand(
        {
          actor,
          leadId: lead.id,
          justification: "Need better rate",
          artifactIds: [artifactId],
        },
        workflowCommandPorts(runtime),
      );

      expect(expectErr(result).code).toBe(
        "rate_revision_file_not_submit_ready",
      );
      expect((await loadDetail(lead.id)).rateRevisions).toHaveLength(0);
    },
  );

  it("rejects already linked revision files", async () => {
    const actor = actorBy("execOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "pricing",
      proposal: "none",
      key: "revision-linked",
      organization: { key: "revision-linked" },
    });
    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: actorBy("backOne"),
    });
    // A revision that already owns the artifact, while the proposal is still pending:
    // an edge a simple command sequence cannot reach (a real revision would decide the
    // proposal), so it is seeded directly.
    const revisionId = asWorkflowRateRevisionId("revision-existing");
    await runtime.ctx.db
      .insertInto("workflow_rate_revisions")
      .values({
        id: revisionId,
        lead_id: lead.id,
        proposal_id: proposalId,
        round: 1,
        justification: "Previous revision",
        requested_by: actor.userId,
        requested_at: runtime.now.get(),
      })
      .execute();
    const artifactId = asWorkflowArtifactId("artifact-linked");
    await seedRateRevisionArtifact(runtime, {
      artifactId,
      leadId: lead.id,
      requestedByUserId: actor.userId,
      linkedRevisionId: revisionId,
    });

    const result = await requestRateRevisionCommand(
      {
        actor,
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: [artifactId],
      },
      workflowCommandPorts(runtime),
    );

    expect(expectErr(result).code).toBe("rate_revision_file_not_submit_ready");
    expect((await loadDetail(lead.id)).rateRevisions).toHaveLength(1);
  });
});
