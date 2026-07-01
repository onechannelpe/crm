import type { Role } from "~/lib/auth/access/rbac";
import type { PolicyActor } from "~/server/files/policy";
import type { WorkflowArtifact } from "~/server/files/types";
import {
  asBranchId,
  asUserId,
  asWorkflowArtifactId,
} from "~/server/shared/ids";

export function makeArtifact(
  overrides?: Partial<WorkflowArtifact>,
): WorkflowArtifact {
  return {
    id: asWorkflowArtifactId("artifact-1"),
    artifactType: "records_export",
    direction: "download",
    executionMode: "sync",
    status: "ready",
    requestedByUserId: asUserId("policy-user-10"),
    scopeBranchId: asBranchId("policy-branch-1"),
    scopeTeamId: null,
    policySnapshotJson: "{}",
    workflowContextJson: "{}",
    errorCode: null,
    errorMessage: null,
    expiresAt: null,
    createdAt: new Date(1_700_000_000_000),
    updatedAt: new Date(1_700_000_000_000),
    ...overrides,
  };
}

export function makeActor(overrides?: Partial<PolicyActor>): PolicyActor {
  return {
    userId: asUserId("policy-user-10"),
    role: "back_office",
    branchId: asBranchId("policy-branch-1"),
    ...overrides,
  };
}

export type RolePolicyCase = {
  role: Role;
  ok: boolean;
};
