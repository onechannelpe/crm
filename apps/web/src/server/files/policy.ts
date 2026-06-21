import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { ArtifactType, WorkflowArtifact } from "./types";

export type PolicyAction =
  | "artifact.request"
  | "artifact.upload"
  | "artifact.read"
  | "artifact.revoke"
  | "artifact.audit.read";

export interface PolicyActor {
  userId: number;
  role: Role;
  branchId: number;
}

const ARTIFACT_DIRECTIONS: Record<
  ArtifactType,
  "upload" | "download" | "bidirectional"
> = {
  records_export: "download",
  integration_import: "upload",
  sale_proof: "upload",
  rate_revision_file: "upload",
};

function deny(code: string): Result<void, DomainError> {
  return Err(forbidden({ code }));
}

function allow(): Result<void, DomainError> {
  return Ok(undefined);
}

function canRequest(
  actor: PolicyActor,
  artifactType: ArtifactType,
): Result<void, DomainError> {
  if (
    (artifactType === "sale_proof" || artifactType === "rate_revision_file") &&
    actor.role === "executive"
  ) {
    return allow();
  }

  if (!hasPermission(actor.role, "file:artifact:request")) {
    return deny("artifact_request_forbidden");
  }

  if (artifactType === "records_export" && actor.role === "executive") {
    return deny("executive_cross_scope_denied");
  }

  return allow();
}

function canUpload(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  const isExecutiveOwnedUpload =
    (artifact.artifactType === "sale_proof" ||
      artifact.artifactType === "rate_revision_file") &&
    actor.role === "executive";
  if (!isExecutiveOwnedUpload) {
    if (!hasPermission(actor.role, "file:artifact:upload")) {
      return deny("artifact_upload_forbidden");
    }
  }

  const dir = ARTIFACT_DIRECTIONS[artifact.artifactType];
  if (dir === "download") {
    return deny("artifact_not_uploadable");
  }

  if (
    artifact.requestedByUserId !== actor.userId &&
    actor.role !== "admin" &&
    actor.role !== "superuser"
  ) {
    return deny("artifact_upload_not_owner");
  }

  if (artifact.status !== "requested") {
    return deny("artifact_upload_wrong_status");
  }

  return allow();
}

function canRead(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  const isExecutiveReadable =
    (artifact.artifactType === "sale_proof" ||
      artifact.artifactType === "rate_revision_file") &&
    actor.role === "executive";
  if (
    !isExecutiveReadable &&
    !hasPermission(actor.role, "file:artifact:read")
  ) {
    return deny("artifact_read_forbidden");
  }

  if (artifact.status === "revoked" || artifact.status === "expired") {
    return deny("artifact_unavailable");
  }

  if (actor.role === "superuser" || actor.role === "admin") {
    return allow();
  }

  if (artifact.requestedByUserId === actor.userId) {
    return allow();
  }

  if (artifact.scopeBranchId === null) {
    return deny("artifact_read_not_owner");
  }

  if (artifact.scopeBranchId !== actor.branchId) {
    return deny("artifact_scope_mismatch");
  }

  return allow();
}

function canRevoke(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  if (actor.role !== "admin" && actor.role !== "superuser") {
    return deny("artifact_revoke_forbidden");
  }

  if (artifact.status === "revoked" || artifact.status === "expired") {
    return deny("artifact_already_terminal");
  }

  return allow();
}

function canReadAudit(actor: PolicyActor): Result<void, DomainError> {
  if (!hasPermission(actor.role, "file:artifact:audit:read")) {
    return deny("artifact_audit_forbidden");
  }

  return allow();
}

export function checkArtifactPolicy(
  actor: PolicyActor,
  artifact: WorkflowArtifact | null,
  action: PolicyAction,
  requestArtifactType?: ArtifactType,
): Result<void, DomainError> {
  switch (action) {
    case "artifact.request":
      return canRequest(
        actor,
        requestArtifactType ?? artifact?.artifactType ?? "records_export",
      );
    case "artifact.upload":
      if (!artifact) {
        return deny("artifact_not_found");
      }
      return canUpload(actor, artifact);
    case "artifact.read":
      if (!artifact) {
        return deny("artifact_not_found");
      }
      return canRead(actor, artifact);
    case "artifact.revoke":
      if (!artifact) {
        return deny("artifact_not_found");
      }
      return canRevoke(actor, artifact);
    case "artifact.audit.read":
      return canReadAudit(actor);
    default: {
      action satisfies never;
      return deny("unknown_action");
    }
  }
}
