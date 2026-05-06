import type { Role } from "~/lib/auth/access/rbac";
import type { PolicyActor } from "~/server/files/policy";
import type { WorkflowArtifact } from "~/server/files/types";

export function makeArtifact(
  overrides?: Partial<WorkflowArtifact>,
): WorkflowArtifact {
  return {
    id: "artifact-1",
    artifactType: "records_export",
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
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

export function makeActor(overrides?: Partial<PolicyActor>): PolicyActor {
  return {
    userId: 10,
    role: "back_office",
    branchId: 1,
    ...overrides,
  };
}

export type RolePolicyCase = {
  role: Role;
  ok: boolean;
};
