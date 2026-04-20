import { describe, expect, it } from "vitest";

import {
  checkArtifactPolicy,
  checkDownloadPolicy,
  type PolicyActor,
} from "../../src/server/files/policy";
import type { WorkflowArtifact } from "../../src/server/files/types";

function makeArtifact(overrides?: Partial<WorkflowArtifact>): WorkflowArtifact {
  return {
    id: 1,
    artifactType: "leads_export",
    direction: "download",
    executionMode: "sync",
    status: "ready",
    requestedByUserId: 10,
    scopeBranchId: 1,
    scopeTeamId: null,
    policySnapshotJson: "{}",
    workflowContextJson: "{}",
    errorCode: null,
    errorMessage: null,
    expiresAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeActor(overrides?: Partial<PolicyActor>): PolicyActor {
  return {
    userId: 10,
    role: "back_office",
    branchId: 1,
    ...overrides,
  };
}

describe("checkArtifactPolicy - artifact.request", () => {
  it("allows back_office to request leads_export", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office" }),
      null,
      "artifact.request",
    );
    expect(result.ok).toBe(true);
  });

  it("allows admin to request any artifact", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "admin" }),
      null,
      "artifact.request",
    );
    expect(result.ok).toBe(true);
  });

  it("denies executive from requesting artifacts", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "executive" }),
      null,
      "artifact.request",
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("forbidden");
  });

  it("denies supervisor from requesting (no file:artifact:request permission)", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "supervisor" }),
      null,
      "artifact.request",
    );
    expect(result.ok).toBe(false);
  });
});

describe("checkArtifactPolicy - artifact.upload", () => {
  it("allows back_office to upload to integration_import artifact they own", () => {
    const artifact = makeArtifact({
      artifactType: "integration_import",
      direction: "upload",
      status: "requested",
      requestedByUserId: 10,
    });
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office", userId: 10 }),
      artifact,
      "artifact.upload",
    );
    expect(result.ok).toBe(true);
  });

  it("denies upload to download-only artifact type", () => {
    const artifact = makeArtifact({
      artifactType: "leads_export",
      direction: "download",
      status: "requested",
    });
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office" }),
      artifact,
      "artifact.upload",
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("artifact_not_uploadable");
  });

  it("denies upload when artifact is not in requested state", () => {
    const artifact = makeArtifact({
      artifactType: "integration_import",
      direction: "upload",
      status: "ready",
    });
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office" }),
      artifact,
      "artifact.upload",
    );
    expect(result.ok).toBe(false);
  });
});

describe("checkArtifactPolicy - artifact.read", () => {
  it("allows back_office to read artifact in their scope", () => {
    const artifact = makeArtifact({ scopeBranchId: 1 });
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office", branchId: 1 }),
      artifact,
      "artifact.read",
    );
    expect(result.ok).toBe(true);
  });

  it("denies back_office from reading artifact in different scope", () => {
    const artifact = makeArtifact({ scopeBranchId: 99 });
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office", branchId: 1 }),
      artifact,
      "artifact.read",
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("artifact_scope_mismatch");
  });

  it("allows superuser to read any scope artifact", () => {
    const artifact = makeArtifact({ scopeBranchId: 99 });
    const result = checkArtifactPolicy(
      makeActor({ role: "superuser", branchId: 1 }),
      artifact,
      "artifact.read",
    );
    expect(result.ok).toBe(true);
  });

  it("denies read on revoked artifact", () => {
    const artifact = makeArtifact({ status: "revoked" });
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office" }),
      artifact,
      "artifact.read",
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("artifact_unavailable");
  });

  it("denies read on expired artifact", () => {
    const artifact = makeArtifact({ status: "expired" });
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office" }),
      artifact,
      "artifact.read",
    );
    expect(result.ok).toBe(false);
  });

  it("denies executive who lacks file:artifact:read", () => {
    const artifact = makeArtifact();
    const result = checkArtifactPolicy(
      makeActor({ role: "executive" }),
      artifact,
      "artifact.read",
    );
    expect(result.ok).toBe(false);
  });
});

describe("checkArtifactPolicy - artifact.audit.read", () => {
  it("allows supervisor to read audit", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "supervisor" }),
      null,
      "artifact.audit.read",
    );
    expect(result.ok).toBe(true);
  });

  it("allows sales_manager to read audit", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "sales_manager" }),
      null,
      "artifact.audit.read",
    );
    expect(result.ok).toBe(true);
  });

  it("denies back_office from audit (no audit permission)", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office" }),
      null,
      "artifact.audit.read",
    );
    expect(result.ok).toBe(false);
  });

  it("denies executive from audit", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "executive" }),
      null,
      "artifact.audit.read",
    );
    expect(result.ok).toBe(false);
  });
});

describe("checkDownloadPolicy", () => {
  it("allows download when artifact is ready and actor has read permission in scope", () => {
    const artifact = makeArtifact({ status: "ready", scopeBranchId: 1 });
    const result = checkDownloadPolicy(
      makeActor({ role: "back_office", branchId: 1 }),
      artifact,
    );
    expect(result.ok).toBe(true);
  });

  it("allows download when artifact is completed", () => {
    const artifact = makeArtifact({ status: "completed", scopeBranchId: 1 });
    const result = checkDownloadPolicy(
      makeActor({ role: "back_office", branchId: 1 }),
      artifact,
    );
    expect(result.ok).toBe(true);
  });

  it("denies download when artifact is still processing", () => {
    const artifact = makeArtifact({ status: "processing" });
    const result = checkDownloadPolicy(
      makeActor({ role: "back_office" }),
      artifact,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("artifact_not_downloadable");
  });

  it("denies download when artifact is revoked", () => {
    const artifact = makeArtifact({ status: "revoked" });
    const result = checkDownloadPolicy(
      makeActor({ role: "back_office" }),
      artifact,
    );
    expect(result.ok).toBe(false);
  });

  it("denies download from wrong scope", () => {
    const artifact = makeArtifact({ status: "ready", scopeBranchId: 99 });
    const result = checkDownloadPolicy(
      makeActor({ role: "back_office", branchId: 1 }),
      artifact,
    );
    expect(result.ok).toBe(false);
  });

  it("denies download attempt by actor without file:artifact:read", () => {
    const artifact = makeArtifact({ status: "ready" });
    const result = checkDownloadPolicy(
      makeActor({ role: "executive" }),
      artifact,
    );
    expect(result.ok).toBe(false);
  });
});
